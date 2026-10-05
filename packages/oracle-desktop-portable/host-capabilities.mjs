import { accessSync, constants } from 'node:fs';
import { execFile } from 'node:child_process';
import {validatedCodexInterviewLink} from './codex-interview-link.mjs';
import { isAbsolute, win32 } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const available = executable => { try { accessSync(executable, constants.X_OK); return true; } catch { return false; } };
function executeWithInput(executable, args, { input, ...options }) {
  return new Promise((resolve, reject) => {
    const child = execFile(executable, args, { ...options, ...(input !== undefined ? { env: { ...process.env, LC_ALL: 'en_US.UTF-8' } } : {}), shell: false }, (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr }));
    child.stdin.on('error', error => { child.kill(); reject(error); });
    child.stdin.end(input);
  });
}
export class HostCapabilityError extends Error {
  constructor(capability, message) { super(message); this.name = 'HostCapabilityError'; this.code = 'host_capability_unsupported'; this.capability = capability; }
}
const unsupported = capability => { throw new HostCapabilityError(capability, `O host não oferece ${capability}.`); };
const providerMethods = Object.freeze({ directoryPicker: 'chooseDirectory', directoryGrants: 'verifyDirectoryGrant', protectedSecrets: 'readProtectedSecret', deviceBinding: 'verifyDeviceBinding', localAuthentication: 'authenticate', scheduler: 'schedule', reveal: 'reveal', clipboard: 'copy', openExternal: 'openExternal', updates: 'checkUpdates' });

/** MCP roots describe context. They do not create a durable authorization grant.
 * UI host capabilities: https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiHostCapabilities.html */
export function createHostCapabilities({ host = {}, providers = {}, runtime = {} } = {}) {
  const absolute = runtime.platform === 'win32' ? win32.isAbsolute : isAbsolute;
  const supported = name => {
    if (name === 'openLinks' || name === 'downloadFile') return !!host[name] && typeof providers[name] === 'function';
    return typeof providers[providerMethods[name]] === 'function';
  };
  const snapshot = () => Object.freeze({ runtime: Object.freeze({ name: runtime.name ?? 'unknown', version: runtime.version ?? null, platform: runtime.platform ?? process.platform, architecture: runtime.architecture ?? process.arch }), capabilities: Object.freeze(Object.fromEntries([...Object.keys(providerMethods), 'openLinks', 'downloadFile'].map(name => [name, supported(name)]))), mcpRootsAreGrants: false });
  return Object.freeze({ snapshot, require(name) { if (!supported(name)) unsupported(name); return providers[providerMethods[name] ?? name]; },
    async chooseDirectory({ userInitiated = false, signal } = {}) {
      if (!userInitiated) throw new HostCapabilityError('directoryPicker', 'Escolha da pasta exige uma ação explícita.');
      const result = await this.require('directoryPicker')({ signal });
      if (result === null) return null;
      if (!result || !absolute(result.path ?? '') || result.authorization !== 'explicit-user-selection') throw new HostCapabilityError('directoryPicker', 'A seleção da pasta não foi confirmada.');
      return Object.freeze({ ...result });
    },
    async verifyDirectoryGrant(grant) {
      const result = await this.require('directoryGrants')(grant);
      if (result?.authorized !== true || result?.revoked === true) throw new HostCapabilityError('directoryGrants', 'Permissão da pasta não confirmada.');
      return result;
    },
  });
}

/** Official Standard Additions picker invoked only by a client action.
 * No GUI automation, shell interpolation, Keychain or permissions mutation.
 * https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/PromptforaFileorFolder.html
 * A selected path is not a security-scoped bookmark or a persistent grant. */
export function createMacDirectoryPicker({ platform = process.platform, runner = execute, executableAvailable = available } = {}) {
  if (platform !== 'darwin' || !executableAvailable('/usr/bin/osascript')) return Object.freeze({});
  return Object.freeze({
    async chooseDirectory({ signal } = {}) {
      let result;
      try {
        result = await runner('/usr/bin/osascript', ['-e', 'POSIX path of (choose folder with prompt "Escolha a pasta do seu vault Obsidian para o Oracle")'], { encoding: 'utf8', timeout: 120000, maxBuffer: 16384, signal });
      } catch (error) {
        if (/\(-128\)/.test(error.stderr ?? '')) return null;
        throw new HostCapabilityError('directoryPicker', 'O macOS não concluiu a escolha da pasta.');
      }
      // Remove only the output terminator. Leading/trailing spaces belong to paths.
      const path = String(result.stdout ?? '').replace(/\r?\n$/, '');
      if (!isAbsolute(path) || path.includes('\0')) throw new HostCapabilityError('directoryPicker', 'O macOS retornou uma pasta inválida.');
      return { path, authorization: 'explicit-user-selection', mechanism: 'apple-standard-additions', persistentGrant: false };
    },
  });
}

/** Native openExternal allows HTTP/HTTPS with a host and no credentials.
 * Paths, other schemes, parser-normalized backslashes and malformed inputs fail closed. */
export function validatedExternalURL(value) {
  const reject = () => { throw Object.assign(new Error('Link externo inválido.'), { code: 'invalid_request' }); };
  if (typeof value !== 'string' || Buffer.byteLength(value) > 8192 || /[\s\x00-\x1f\x7f\\]/u.test(value)) reject();
  const authority = /^https?:\/\/([^/?#]+)/.exec(value)?.[1];
  if (!authority || authority.includes('@')) reject();
  let url; try { url = new URL(value); } catch { reject(); }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) reject();
  return url.href;
}

/** Apple system programs, invoked by normal product actions. No shell or GUI automation.
 * These are local providers, not advertised MCP host openLinks/downloadFile capabilities. */
export function createMacNativeProviders({ platform = process.platform, runner = executeWithInput, executableAvailable = available } = {}) {
  if (platform !== 'darwin') return Object.freeze({});
  const providers = {};
  const run = async (capability, executable, args, input, signal) => {
    try { await runner(executable, args, { input, encoding: 'utf8', shell: false, timeout: 5000, maxBuffer: 16384, signal }); }
    catch { throw new HostCapabilityError(capability, capability === 'clipboard' ? 'O macOS não concluiu a cópia.' : capability === 'reveal' ? 'O macOS não mostrou o arquivo.' : 'O macOS não abriu o link.'); }
    return true;
  };
  if (executableAvailable('/usr/bin/pbcopy')) providers.copy = async (text, { signal } = {}) => {
    if (typeof text !== 'string' || Buffer.byteLength(text) > 2_000_000 || Buffer.from(text, 'utf8').toString('utf8') !== text) throw Object.assign(new Error('Texto inválido.'), { code: 'invalid_request' });
    return run('clipboard', '/usr/bin/pbcopy', [], Buffer.from(text, 'utf8'), signal);
  };
  if (executableAvailable('/usr/bin/open')) providers.reveal = async (path, { signal } = {}) => {
    if(typeof path!=='string'||!isAbsolute(path)||/[\x00-\x1f\x7f]/.test(path)||Buffer.byteLength(path)>4096)throw Object.assign(new Error('Arquivo inválido.'),{code:'invalid_request'});
    return run('reveal','/usr/bin/open',['-R','--',path],undefined,signal);
  };
  if (executableAvailable('/usr/bin/open')) providers.openExternal = async (url, { signal } = {}) => run('openExternal', '/usr/bin/open', ['--', validatedExternalURL(url)], undefined, signal);
  if (executableAvailable('/usr/bin/open')) providers.openCodex = async (url, { signal } = {}) => run('openCodex', '/usr/bin/open', ['-b', 'com.openai.codex', '--', validatedCodexInterviewLink(url)], undefined, signal);
  return Object.freeze(providers);
}

export function createMacDefaultProviders(options = {}) {
  return Object.freeze({ ...createMacDirectoryPicker(options), ...createMacNativeProviders(options) });
}
