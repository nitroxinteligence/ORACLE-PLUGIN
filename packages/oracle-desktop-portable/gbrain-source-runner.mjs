import { spawn } from 'node:child_process';
import {createGBrainMCPSession} from './gbrain-mcp-session.mjs';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import {gbrainPrivateEnvironment,pathsOverlap} from './platform-process-environment.mjs';

export const GBRAIN_SOURCE_PIN = "e7f59913e34667d883ea68bcd7236c0e4a6d5b8e";
export const GBRAIN_SOURCE_VERSION = "0.60.94.0";
const admittedRuntimes = new Map();
const identityKey = stat => [stat.dev,stat.ino,stat.size,stat.mtimeMs,stat.ctimeMs].join(':');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function canonical(path, directory) {
  if (!isAbsolute(path) || resolve(path) !== path || realpathSync(path) !== path || lstatSync(path).isSymbolicLink() || (directory ? !lstatSync(path).isDirectory() : !lstatSync(path).isFile())) throw Error('GBrain runner requires canonical trusted paths');
  return path;
}

/** Trusted composition only: runtime/source paths and command arguments are not RPC inputs.
 * Runs upstream sources in a child because ownedConfig mutates the process environment.
 * Source/package admission is the packaging layer's responsibility, not a file UUID. */
export function createGBrainSourceRunner({ runtime, runtimeSHA256, sourceRoot, stateRoot, vaultRoot, bunConfig, platform=process.platform, systemDirectory, networkSandbox = platform === 'darwin' } = {}) {
  canonical(runtime, false); canonical(sourceRoot, true); canonical(stateRoot, true); canonical(vaultRoot, true); canonical(bunConfig, false);
  const admittedKey = runtime + ':' + runtimeSHA256, currentIdentity = identityKey(lstatSync(runtime));
  if (!/^[0-9a-f]{64}$/.test(runtimeSHA256 ?? '')) throw Error('Bun runtime does not match its admitted hash');
  if (admittedRuntimes.get(admittedKey) !== currentIdentity) {
    if (sha(readFileSync(runtime)) !== runtimeSHA256 || identityKey(lstatSync(runtime)) !== currentIdentity) throw Error('Bun runtime does not match its admitted hash');
    admittedRuntimes.set(admittedKey,currentIdentity);
  }
  if (platform !== 'darwin' && networkSandbox) throw Object.assign(Error('Network sandbox provider unavailable on this platform'),{code:'host_capability_unsupported'});
  if (pathsOverlap(stateRoot,vaultRoot,{platform})) throw Error('GBrain profile cannot overlap the vault');
  const runtimeIdentity = lstatSync(runtime);
  const profile = join(stateRoot, 'gbrain/profile'), work = join(stateRoot, 'gbrain/workspace');
  canonical(profile, true); canonical(work, true); canonical(join(stateRoot, 'execution-home'), true); canonical(join(stateRoot, 'tmp'), true); canonical(join(stateRoot, 'events'), true);
  const env = gbrainPrivateEnvironment({stateRoot,profile,platform,systemDirectory});
  async function run(entry, args, { input, timeoutMs = 120000, signal } = {}) {
    if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string' || arg.includes('\0')) || !Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 600000) throw Error('Invalid GBrain process request');
    const current = lstatSync(runtime);
    if (current.ino !== runtimeIdentity.ino || current.dev !== runtimeIdentity.dev || current.size !== runtimeIdentity.size || current.mtimeMs !== runtimeIdentity.mtimeMs || current.ctimeMs !== runtimeIdentity.ctimeMs || realpathSync(runtime) !== runtime) throw Error('Admitted Bun runtime changed');
    if (input && Buffer.byteLength(input) > 16000000) throw Error('GBrain request exceeds 16 MB');
    const argv = ['run', '--no-env-file', '--no-install', `--config=${bunConfig}`, entry, ...args];
    const command = networkSandbox ? '/usr/bin/sandbox-exec' : runtime;
    const commandArgs = networkSandbox ? ['-p', '(version 1)(allow default)(deny network*)', runtime, ...argv] : argv;
    return new Promise((resolveResult, reject) => {
      const child = spawn(command, commandArgs, { cwd: work, env, detached: platform !== 'win32', windowsHide: platform === 'win32', shell: false, stdio: ['pipe', 'pipe', 'pipe'], signal });
      let stdout = '', stderr = '', overflow = false, timedOut = false;
      const kill = () => { try { if(platform==='win32')child.kill('SIGKILL');else process.kill(-child.pid, 'SIGKILL'); } catch { /* Already reaped. */ } };
      const timer = setTimeout(() => { timedOut = true; kill(); }, timeoutMs);
      child.stdout.on('data', data => { stdout += data.toString('utf8'); if (Buffer.byteLength(stdout) > 16000000) { overflow = true; kill(); } });
      child.stderr.on('data', data => { stderr = (stderr + data.toString('utf8')).slice(-16000); });
      child.stdin.on('error', error => { if (error.code !== 'EPIPE') { kill(); reject(error); } });
      child.on('error', error => { clearTimeout(timer); kill(); reject(error); });
      child.on('close', (code, exitSignal) => {
        clearTimeout(timer); kill();
        const result = { code, signal: exitSignal, stdout, stderr, networkDenied: networkSandbox, command, args: commandArgs };
        if (timedOut || overflow || code !== 0) { const error = Error(timedOut ? 'GBrain process deadline exceeded' : overflow ? 'GBrain output exceeds limit' : `GBrain source process failed (${code}): ${stderr.slice(-1000)}`); error.result = result; reject(error); }
        else resolveResult(result);
      });
      child.stdin.end(input ?? '');
    });
  }
  const argv=['run','--no-env-file','--no-install',`--config=${bunConfig}`,join(sourceRoot,'packages/gbrain-adapter/read.ts'),'--mcp'];
  const command=networkSandbox?'/usr/bin/sandbox-exec':runtime,args=networkSandbox?['-p','(version 1)(allow default)(deny network*)',runtime,...argv]:argv;
  const memorySession=createGBrainMCPSession({command,args,cwd:work,env:{...env,ORACLE_MCP_VAULT:vaultRoot},platform,networkDenied:networkSandbox});
  async function memory(request,{vaultEpochSHA256,signal,timeoutMs=45000}={}) {
    function check(){
    const allowed=new Set(['remember','recall','entity','context_pack','delta','forget','search','get_page','list_pages','get_links','get_backlinks','traverse_graph','put_page']);
    if(!request||!['tools/list','tools/call'].includes(request.method)||request.method==='tools/call'&&!allowed.has(request.params?.name)||Buffer.byteLength(JSON.stringify(request.params??{}))>500000||!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>45000)throw Error('Invalid official MCP request');
    const epochFile=resolve(profile,'../vault-epoch.json');
    canonical(epochFile,false);const epochIdentity=lstatSync(epochFile);if(epochIdentity.size>4096||epochIdentity.nlink!==1)throw Error('Unsafe official MCP epoch receipt');
    if(!/^[a-f0-9]{64}$/.test(vaultEpochSHA256??'')||sha(readFileSync(epochFile))!==vaultEpochSHA256)throw Error('Official MCP requires the current reviewed vault epoch');
    const current=lstatSync(runtime);
    if(current.ino!==runtimeIdentity.ino||current.dev!==runtimeIdentity.dev||current.size!==runtimeIdentity.size||current.mtimeMs!==runtimeIdentity.mtimeMs||current.ctimeMs!==runtimeIdentity.ctimeMs||realpathSync(runtime)!==runtime)throw Error('Admitted Bun runtime changed');
    }
    try { check(); } catch (error) { memorySession.close(); throw error; }
    return memorySession.request(request,{key:vaultEpochSHA256,signal,timeoutMs,check});
  }
  return Object.freeze({ profile, sourcePin: GBRAIN_SOURCE_PIN,
    memory, closeMemory(){memorySession.close();}, get memorySessionGeneration(){return memorySession.generation;},
    executeCli(args, options) { return run(join(sourceRoot, 'vendor/gbrain/src/cli.ts'), args, options); },
    async read(request, options) {
      if (!request || !['initialize', 'prepare-writer', 'upgrade-profile', 'status', 'search', 'get', 'graph', 'list', 'index', 'backup'].includes(request.operation)) throw Error('Unsupported GBrain source operation');
      if (['initialize','prepare-writer','upgrade-profile'].includes(request.operation) && request.root !== vaultRoot) throw Error('Initialization does not match the selected vault');
      if (request.operation === 'index' && (request.root !== vaultRoot || request.source !== 'oracle-vault')) throw Error('Index request does not match the selected vault');
      const result = await run(join(sourceRoot, 'packages/gbrain-adapter/read.ts'), [], { ...options, input: JSON.stringify({ ...request, owned: true }) });
      let response; try { response = JSON.parse(result.stdout.trim()); } catch { throw Error('GBrain source response is not a single JSON envelope'); }
      if (response.ok !== true) throw Error(response.error ?? 'GBrain source request failed');
      return { ...result, value: response.value };
    },
  });
}
