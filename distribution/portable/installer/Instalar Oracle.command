#!/bin/bash
set -euo pipefail
umask 077
export GIT_TERMINAL_PROMPT=0

oracle_installer_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$oracle_installer_root/installer-lib.sh"

oracle_installer_scratch=''
oracle_installer_exit() {
  local result=$?
  [ -z "$oracle_installer_scratch" ] || /bin/rm -rf -- "$oracle_installer_scratch"
  if [ "$result" -ne 0 ]; then
    printf '\n%s\n' 'A instalação não foi concluída. Copie a mensagem acima para o suporte do Oracle. Seus dados e outros plugins foram preservados.' >&2
  fi
  if [ -t 0 ]; then
    printf '\nPressione Enter para fechar. '
    read -r _ || true
  fi
  return "$result"
}
trap oracle_installer_exit EXIT

if [ "$(/usr/bin/uname -s)" != Darwin ] || { [ "$(/usr/bin/uname -m)" != arm64 ] && [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null || true)" != 1 ]; }; then
  printf '%s\n' 'Este instalador exige um Mac com Apple Silicon (M1 ou posterior).' >&2
  exit 1
fi
oracle_installer_cli=$(oracle_find_cli)
oracle_installer_scratch=$(/usr/bin/mktemp -d -t oracle-plugin-install)
printf '%s\n' 'ORACLE System | instalação local do plugin'
if [ -f "$oracle_installer_root/plugin-archive.json" ]; then
  source "$oracle_installer_root/local-package.sh"
  oracle_installer_data="$HOME/Library/Application Support/OracleSystemPluginInstaller"
  if [ "$#" -gt 0 ]; then
    # Explicit isolated harness only, never a production profile override.
    [ "$#" -eq 2 ] && [ "$1" = --test-state ] && [ -d "$2" ] && [[ "$2" = /*/.work/* ]] && [ "$(cd -- "$2" && pwd -P)" = "$2" ] && [ "${CODEX_HOME:-}" = "$2/codex" ] && [ -d "$2/codex" ] || { printf '%s\n' 'Estado de teste isolado inválido.' >&2; exit 1; }
    oracle_installer_data="$2/source"
  fi
  oracle_install_local "$oracle_installer_cli" "$oracle_installer_scratch" "$oracle_installer_data" "$oracle_installer_root"
else
  oracle_install "$oracle_installer_cli" "$oracle_installer_scratch"
fi
