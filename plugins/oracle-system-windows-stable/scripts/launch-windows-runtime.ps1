# Runs as an inline script block under Windows PowerShell 5.1; no policy changes.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$lock = $null
$pinned = $null
$temporary = $null
$process = $null
function Assert-PlainPath([string]$path) {
    $cursor = [IO.Path]::GetFullPath($path)
    while ($cursor) {
        if ([IO.File]::Exists($cursor) -or [IO.Directory]::Exists($cursor)) {
            if (([IO.File]::GetAttributes($cursor) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Reparse point in runtime path' }
        }
        $parent = [IO.Path]::GetDirectoryName($cursor)
        if ($parent -eq $cursor) { break }
        $cursor = $parent
    }
}
function Get-StreamHash($stream) {
    $hash = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($hash.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $hash.Dispose() }
}
function Assert-PrivateDirectory([string]$path) {
    Assert-PlainPath $path
    if (-not [IO.Directory]::Exists($path)) { throw 'Missing private runtime directory' }
    $acl = [IO.Directory]::GetAccessControl($path)
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $script:userSid.Value -or -not $acl.AreAccessRulesProtected) { throw 'Invalid runtime directory owner or inheritance' }
    foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
        if ($rule.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and $rule.IdentityReference.Value -notin $script:allowedSids) { throw 'Runtime directory accessible by another identity' }
    }
}
try {
    if ($env:OS -ne 'Windows_NT') { throw 'Windows runtime required' }
    if ([string]::IsNullOrWhiteSpace($env:ORACLE_PORTABLE_PLUGIN_ROOT) -or [string]::IsNullOrWhiteSpace($env:ORACLE_PORTABLE_PLUGIN_DATA)) { throw 'Plugin root and private data are required' }
    $root = [IO.Path]::GetFullPath($env:ORACLE_PORTABLE_PLUGIN_ROOT)
    $data = [IO.Path]::GetFullPath($env:ORACLE_PORTABLE_PLUGIN_DATA)
    if ($root.StartsWith('\\') -or $data.StartsWith('\\')) { throw 'Local runtime paths required' }
    Assert-PlainPath $root
    Assert-PlainPath $data
    if (-not [IO.Directory]::Exists($data)) { throw 'Host plugin data directory is missing' }
    $manifestPath = [IO.Path]::Combine($root, 'runtime-payload-manifest.json')
    Assert-PlainPath $manifestPath
    $manifest = [IO.File]::ReadAllText($manifestPath) | ConvertFrom-Json
    $packed = $manifest.packedRuntime
    if ($packed.path -cne 'runtime/bun.exe.gz' -or $packed.sha256 -cnotmatch '^[a-f0-9]{64}$' -or $manifest.runtimeSHA256 -cnotmatch '^[a-f0-9]{64}$') { throw 'Invalid runtime manifest' }
    if ($packed.bytes -isnot [long] -and $packed.bytes -isnot [int]) { throw 'Invalid archive size' }
    if ($packed.expandedBytes -isnot [long] -and $packed.expandedBytes -isnot [int]) { throw 'Invalid expanded runtime size' }
    if ($packed.bytes -le 0 -or $packed.bytes -ge 100000000 -or $packed.expandedBytes -le 0 -or $packed.expandedBytes -gt 268435456) { throw 'Runtime size exceeds bounds' }
    if ($manifest.runtimeSHA256 -cne $env:ORACLE_WINDOWS_RUNTIME_SHA256 -or $packed.sha256 -cne $env:ORACLE_WINDOWS_ARCHIVE_SHA256 -or [string]$packed.bytes -cne $env:ORACLE_WINDOWS_ARCHIVE_BYTES -or [string]$packed.expandedBytes -cne $env:ORACLE_WINDOWS_RUNTIME_BYTES) { throw 'Runtime manifest differs from launcher pins' }
    $script:userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $script:allowedSids = @($userSid.Value, 'S-1-5-18', 'S-1-5-32-544')
    $security = New-Object Security.AccessControl.DirectorySecurity
    $security.SetOwner($userSid)
    $security.SetAccessRuleProtection($true, $false)
    foreach ($sid in $allowedSids) {
        $identity = New-Object Security.Principal.SecurityIdentifier($sid)
        $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $security.AddAccessRule($rule)
    }
    $cache = [IO.Path]::Combine($data, 'oracle-windows-runtime')
    Assert-PlainPath $cache
    if (-not [IO.Directory]::Exists($cache)) { [void][IO.Directory]::CreateDirectory($cache, $security) }
    Assert-PrivateDirectory $cache
    $runtimeDir = [IO.Path]::Combine($cache, $manifest.runtimeSHA256)
    Assert-PlainPath $runtimeDir
    if (-not [IO.Directory]::Exists($runtimeDir)) { [void][IO.Directory]::CreateDirectory($runtimeDir, $security) }
    Assert-PrivateDirectory $runtimeDir
    $lockPath = [IO.Path]::Combine($runtimeDir, 'startup.lock')
    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    while ($null -eq $lock) {
        Assert-PlainPath $lockPath
        try { $lock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None) }
        catch [IO.IOException] { if ([DateTime]::UtcNow -ge $deadline) { throw 'Runtime startup lock timeout' }; Start-Sleep -Milliseconds 100 }
    }
    Assert-PrivateDirectory $runtimeDir
    $executable = [IO.Path]::Combine($runtimeDir, 'bun.exe')
    Assert-PlainPath $executable
    if (-not [IO.File]::Exists($executable)) {
        $archivePath = [IO.Path]::Combine($root, 'runtime', 'bun.exe.gz')
        Assert-PlainPath $archivePath
        $archive = [IO.File]::Open($archivePath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
        $output = $null
        $gzip = $null
        try {
            if ($archive.Length -ne $packed.bytes -or (Get-StreamHash $archive) -cne $packed.sha256) { throw 'Runtime archive checksum mismatch' }
            $archive.Position = 0
            $temporary = [IO.Path]::Combine($runtimeDir, ('bun-' + [Guid]::NewGuid().ToString('N') + '.tmp'))
            $output = [IO.File]::Open($temporary, [IO.FileMode]::CreateNew, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
            $gzip = New-Object IO.Compression.GZipStream($archive, [IO.Compression.CompressionMode]::Decompress, $true)
            $buffer = New-Object byte[] 1048576
            [long]$count = 0
            while (($read = $gzip.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $count += $read
                if ($count -gt $packed.expandedBytes) { throw 'Runtime expanded size exceeds pin' }
                $output.Write($buffer, 0, $read)
            }
            $output.Flush($true)
            $output.Position = 0
            if ($count -ne $packed.expandedBytes -or (Get-StreamHash $output) -cne $manifest.runtimeSHA256) { throw 'Expanded runtime checksum mismatch' }
            $output.Dispose(); $output = $null
            [IO.File]::Move($temporary, $executable)
            $temporary = $null
        } finally {
            if ($null -ne $gzip) { $gzip.Dispose() }
            if ($null -ne $output) { $output.Dispose() }
            $archive.Dispose()
        }
    }
    Assert-PlainPath $executable
    $pinned = [IO.File]::Open($executable, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    if ($pinned.Length -ne $packed.expandedBytes -or (Get-StreamHash $pinned) -cne $manifest.runtimeSHA256) { throw 'Cached runtime checksum mismatch' }
    $lock.Dispose(); $lock = $null
    $payload = [IO.Path]::Combine($root, 'runtime-payload.mjs')
    Assert-PlainPath $payload
    $start = New-Object Diagnostics.ProcessStartInfo
    $start.FileName = $executable
    $start.Arguments = '--no-env-file --no-install "' + $payload + '"'
    $start.WorkingDirectory = $root
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    # No redirection: native child inherits MCP byte streams without PS text pipes.
    $start.RedirectStandardInput = $false
    $start.RedirectStandardOutput = $false
    $start.RedirectStandardError = $false
    $process = [Diagnostics.Process]::Start($start)
    $process.WaitForExit()
    $exitCode = $process.ExitCode
} catch {
    [Console]::Error.WriteLine('Oracle runtime startup failed: ' + $_.Exception.Message)
    $exitCode = 1
} finally {
    if ($null -ne $lock) { $lock.Dispose() }
    if ($null -ne $pinned) { $pinned.Dispose() }
    if ($null -ne $process) { $process.Dispose() }
    if ($null -ne $temporary -and [IO.File]::Exists($temporary)) { [IO.File]::Delete($temporary) }
}
exit $exitCode
