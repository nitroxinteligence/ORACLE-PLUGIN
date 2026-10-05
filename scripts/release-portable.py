#!/usr/bin/env python3
"""Qualified portable release orchestration, with no personal host installation.

CI keys exist only during trusted signing calls. Vendor execution never inherits
publishing credentials, and every publication follows the actual packed gate.
"""
import argparse, base64, hashlib, json, os, pathlib, shutil, subprocess, tempfile, time, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
KEY_ID='oracle-distribution-20260912'
def run(args,cwd=ROOT,env=None):
    print('Etapa: '+pathlib.Path(str(args[0])).name+' '+str(args[1] if len(args)>1 else ''),flush=True)
    p=subprocess.run(list(map(str,args)),cwd=cwd,env=env or os.environ.copy(),capture_output=True,text=True)
    if p.returncode:
        print(p.stderr[-4000:],flush=True);raise subprocess.CalledProcessError(p.returncode,p.args)
    if len(p.stdout)>2000000:raise ValueError('Command output limit')
    if p.stdout.strip():print(p.stdout[-4000:],flush=True)
    return p.stdout
def read(path):return json.loads(pathlib.Path(path).read_text())
def version(v):return tuple(map(int,v.split('.')))

def main(a):
    secret=os.environ.pop('ORACLE_DISTRIBUTION_KEY',None);token=os.environ.pop('GH_TOKEN',None) or os.environ.pop('GITHUB_TOKEN',None)
    if not secret:raise ValueError('Scoped CI distribution signing secret required')
    work=ROOT/'.work';work.mkdir(exist_ok=True);job=pathlib.Path(tempfile.mkdtemp(prefix='release-',dir=work))
    prior_pins=read(ROOT/'Resources/updates/portable-upstream.json')
    api_env={**os.environ,**({'ORACLE_RELEASE_API_TOKEN':token} if token else {})}
    candidates=json.loads(run(['node',ROOT/'scripts/portable-upstream-intake.mjs','--download','no'],env=api_env))
    changed=any(candidates['components'][k]['commit']!=prior_pins[k]['commit'] for k in ['gbrain','aiMemory'])
    if a.event=='schedule' and not changed:print(json.dumps({'changed':False,'published':False}));return
    baseline=job/'baseline';run(['node',ROOT/'scripts/download-portable-baseline.mjs',baseline],env=api_env);previous=read(baseline/'release.json')
    pinned_root=ROOT/'oracle-plugin-release.json'
    pending=previous
    if pinned_root.exists():
        check="import{readFileSync}from'node:fs';import{admitPluginRelease}from'./packages/oracle-desktop-portable/plugin-release-admission.mjs';import{loadReviewedContentTrust}from'./packages/oracle-desktop-portable/content-admission.mjs';const r=admitPluginRelease(readFileSync('oracle-plugin-release.json'),{trust:loadReviewedContentTrust()});console.log(JSON.stringify({version:r.version,sequence:r.sequence}));"
        pending=json.loads(run(['node','--input-type=module','-e',check]))
    source=read(ROOT/'packages/oracle-desktop-portable/plugin.json');floor=max(version(previous['version']),version(pending['version']))
    next_version=source['version'] if version(source['version'])>floor else '.'.join(map(str,[floor[0],floor[1],floor[2]+1]));sequence=max(previous['sequence'],pending['sequence'])+1
    source['version']=next_version;(ROOT/'packages/oracle-desktop-portable/plugin.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
    prior_boot=job/'previous-boot';run(['python3',ROOT/'scripts/qualify-portable-package.py','--archive',previous['archive'],'--output',prior_boot]);prior_runtime=read(prior_boot/'report.json')
    intake=job/'intake';run(['node',ROOT/'scripts/portable-upstream-intake.mjs','--output',intake,'--download','yes'],env=api_env);intake_doc=read(intake/'intake.json');gbrain=intake_doc['components']['gbrain']
    # Provision only this disposable official checkout, honoring its lockfile.
    # No lifecycle scripts, shared vendor changes or implicit native build.
    binaries=job/'binaries';binaries.mkdir()
    for platform,target in [('darwin-arm64','bun-mac'),('win32-x64','bun-windows.exe')]:
        pin=prior_pins['bun'][platform];archive=binaries/(target+'.zip')
        run(['curl','--fail','--silent','--show-error','--location','--proto','=https','--max-time','120','--max-filesize',str(pin['archiveBytes']),'--output',archive,pin['url']])
        data=archive.read_bytes()
        if len(data)!=pin['archiveBytes'] or hashlib.sha256(data).hexdigest()!=pin['archiveSHA256']:raise ValueError('Pinned Bun archive changed')
        with zipfile.ZipFile(archive) as z:binary=z.read(pin['member'])
        if len(binary)!=pin['bytes'] or hashlib.sha256(binary).hexdigest()!=pin['sha256']:raise ValueError('Pinned Bun executable changed')
        (binaries/target).write_bytes(binary);(binaries/target).chmod(0o755)
    bun=binaries/'bun-mac';lock=intake/'gbrain/bun.lock';before=hashlib.sha256(lock.read_bytes()).hexdigest()
    vendor_env={'PATH':os.environ['PATH'],'HOME':str(intake),'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','DO_NOT_TRACK':'1'}
    run([bun,'install','--frozen-lockfile','--ignore-scripts'],cwd=intake/'gbrain',env=vendor_env)
    if hashlib.sha256(lock.read_bytes()).hexdigest()!=before:raise ValueError('Frozen upstream lockfile changed')
    methods=job/'method';run(['python3',ROOT/'scripts/build-official-skills.py','--source',intake/'gbrain','--output',methods,'--pin',gbrain['commit'],'--version',gbrain['version'],'--maximum-bytes','140000000'])
    vendors=job/'vendors';run(['python3',ROOT/'scripts/prepare-portable-vendors.py','--intake',intake,'--output',vendors,'--method',methods])
    test_env={**os.environ,'ORACLE_TEST_AI_MEMORY_BINARY':str(vendors/'ai-memory-mac')}
    run(['node','--test','scripts/test-portable-content-admission.mjs','scripts/test-portable-skills-updates.mjs','scripts/test-portable-profile-upgrade.mjs','scripts/test-portable-official-hooks.mjs','scripts/test-plugin-bridge.mjs','scripts/test-publisher-fetch.mjs','scripts/test-portable-plugin-updates.mjs'],env=test_env)
    catalog=job/'catalog';run(['node',ROOT/'scripts/download-reviewed-skills.mjs',catalog],env=api_env)
    pin_temp=pathlib.Path(os.environ.get('RUNNER_TEMP',tempfile.gettempdir()))
    if pin_temp.resolve()!=pin_temp or pin_temp.is_relative_to(ROOT):raise ValueError('External private CI signing directory required')
    def signed(command):
        fd,key_path=tempfile.mkstemp(prefix='oracle-distribution-',suffix='.pem',dir=pin_temp)
        try:
            os.fchmod(fd,0o600)
            with os.fdopen(fd,'w') as file:file.write(secret)
            return run(command+['--private-key',key_path,'--key-id',KEY_ID])
        finally:pathlib.Path(key_path).unlink(missing_ok=True)
    content={}
    for platform,label,runtime in [('darwin-arm64','mac',bun),('win32-x64','windows',binaries/'bun-windows.exe')]:
        engine=job/('engine-'+label);run(['python3',ROOT/'scripts/prepare-portable-engine.py','--source',intake/'gbrain','--output',engine,'--platform',platform,'--commit',gbrain['commit'],'--version',gbrain['version']])
        directory=job/('content-'+label);run(['python3',ROOT/'scripts/prepare-portable-content.py','--output',directory,'--engine-inventory',engine/'engine-inventory.json','--method',methods,'--catalog-envelope',catalog/'oracle-distribution.json','--catalog-payload',catalog/'payload','--runtime',runtime,'--platform',platform,'--release-id','oracle-portable-content-'+next_version,'--sequence',str(sequence)])
        signed(['node',ROOT/'scripts/sign-portable-content.mjs','--manifest',directory/'manifest.json','--payload-root',directory/'payload','--output',directory/'envelope.json']);content[label]=(directory,engine)
    mac=job/'mac';directory,engine=content['mac'];run(['python3',ROOT/'scripts/package-portable-plugin.py','--runtime',bun,'--engine-inventory',engine/'engine-inventory.json','--ai-memory-runtime',vendors/'ai-memory-mac','--ai-memory-license',vendors/'AI-MEMORY-LICENSE','--content-envelope',directory/'envelope.json','--content-payload',directory/'payload','--output',mac])
    windows=job/'windows';directory,engine=content['windows'];run(['python3',ROOT/'scripts/package-portable-plugin-windows.py','--base-package',mac/'oracle-system-mac-stable','--bun-runtime',binaries/'bun-windows.exe','--ai-memory-runtime',vendors/'ai-memory-windows.exe','--ai-memory-license',vendors/'AI-MEMORY-WINDOWS-LICENSE','--verifier-runtime',bun,'--content-envelope',directory/'envelope.json','--content-payload',directory/'payload','--output',windows,'--version',next_version])
    mac_zip=job/('Oracle-System-'+next_version+'-Mac.zip');win_zip=job/('Oracle-System-'+next_version+'-Windows.zip');shutil.copy2(mac/'oracle-system-mac-stable.zip',mac_zip);shutil.copy2(windows/('oracle-system-windows-stable-windows-x64-'+next_version+'.zip'),win_zip)
    boot=job/'current-boot';run(['python3',ROOT/'scripts/qualify-portable-package.py','--archive',mac_zip,'--output',boot]);current=read(boot/'report.json')
    migration=json.loads(run([bun,ROOT/'scripts/qualify-portable-upstream.mjs','--previous-root',prior_runtime['payloadRoot'],'--previous-bun',prior_runtime['runtime'],'--current-root',current['payloadRoot'],'--current-bun',current['runtime']]))
    stage=job/'marketplace';run(['python3',ROOT/'scripts/prepare-plugin-release.py','--mac',mac_zip,'--windows',win_zip,'--version',next_version,'--output',stage])
    release=job/'oracle-plugin-release.json';revision=run(['git','rev-parse','HEAD']).strip()
    signed(['node',ROOT/'scripts/sign-plugin-release.mjs','--stage',stage,'--version',next_version,'--sequence',str(sequence),'--revision',revision,'--packed-report',boot/'report.json','--migration-report',migration['report'],'--output',release])
    sums=job/'SHA256SUMS';sums.write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in [mac_zip,win_zip,release]))
    if a.mode=='validate':print(json.dumps({'qualified':True,'published':False,'version':next_version}));return
    if not token:raise ValueError('Scoped repository publishing token required')
    for folder in ['plugins','.agents/plugins']:
        destination=ROOT/folder
        if destination.exists():shutil.rmtree(destination)
        shutil.copytree(stage/folder,destination)
    shutil.copy2(release,ROOT/'oracle-plugin-release.json');shutil.copy2(sums,ROOT/'SHA256SUMS')
    publish_env={**os.environ,'GH_TOKEN':token};run(['git','config','user.name','oracle-release'],env=publish_env);run(['git','config','user.email','oracle-release@users.noreply.github.com'],env=publish_env)
    run(['git','add','plugins','.agents/plugins','oracle-plugin-release.json','SHA256SUMS','packages/gbrain-adapter/engine-pins.ts','packages/oracle-desktop-portable/ai-memory-pins.mjs','packages/oracle-desktop-portable/gbrain-native-pins.mjs','packages/oracle-desktop-portable/portable-windows-runtime-pins.mjs','packages/oracle-desktop-portable/content-admission.mjs','packages/oracle-desktop-portable/gbrain-source-runner.mjs','packages/oracle-desktop-portable/plugin.json','Resources/updates/portable-upstream.json','Resources/ai-memory'],env=publish_env)
    run(['git','commit','-m','Publish Oracle System '+next_version+' [skip ci]'],env=publish_env);tag='oracle-system-'+next_version;run(['git','tag',tag],env=publish_env);run(['gh','auth','setup-git'],env=publish_env);run(['git','push','--atomic','origin','HEAD:main','refs/tags/'+tag],env=publish_env)
    notes=job/'release-notes.md';notes.write_text('Atualização completa do Oracle System '+next_version+'.\n\nPacotes assinados, identidade estável, acervo independente e componentes originais compatíveis. Inicialização Mac e migração de perfil verificadas. Execução Windows requer validação em Windows real.\n')
    run(['gh','release','create',tag,mac_zip,win_zip,release,sums,'--draft','--verify-tag','--title','Oracle System '+next_version,'--notes-file',notes],env=publish_env);run(['gh','release','edit',tag,'--draft=false','--latest'],env=publish_env)
    print(json.dumps({'qualified':True,'published':True,'version':next_version,'sequence':sequence}))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--event',required=True,choices=['push','schedule','workflow_dispatch']);p.add_argument('--mode',default='release',choices=['release','validate']);main(p.parse_args())
