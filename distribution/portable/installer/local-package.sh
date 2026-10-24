#!/bin/bash
# Complete packages use the host's local marketplace; no upload or Git checkout.
oracle_install_local() (
  set -euo pipefail
  local cli="$1" scratch="$2" source_root="$3" installer="$4"
  local descriptor="$installer/plugin-archive.json" name version expected actual bytes
  local index=0 market existing_root package_root oracle_package_staging=''
  trap '[ -z "$oracle_package_staging" ] || /bin/rm -rf -- "$oracle_package_staging"' EXIT
  name=$(oracle_json "$descriptor" pluginName)
  version=$(oracle_json "$descriptor" version)
  expected=$(oracle_json "$descriptor" sha256)
  bytes=$(oracle_json "$descriptor" bytes)
  [ "$name" = oracle-system-mac-0-1-32 ] && [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$expected" =~ ^[a-f0-9]{64}$ ]] || { printf '%s\n' 'Identificação do pacote Oracle inválida.' >&2; return 1; }
  [ "$(/usr/bin/stat -f %z "$installer/plugin.zip")" = "$bytes" ] || { printf '%s\n' 'O pacote está incompleto. Baixe o instalador completo novamente.' >&2; return 1; }
  printf '%s\n' 'Conferindo o plugin incluído no instalador...'
  actual=$(/usr/bin/shasum -a 256 "$installer/plugin.zip"); actual=${actual%% *}
  [ "$actual" = "$expected" ] || { printf '%s\n' 'O pacote está corrompido. Baixe o instalador completo novamente.' >&2; return 1; }
  # Only this owned source directory is managed here. PLUGIN_DATA is owned by
  # the Desktop and is never copied, deleted or reset by the installer.
  if [ -e "$source_root" ] || [ -L "$source_root" ]; then
    [ -d "$source_root" ] && [ ! -L "$source_root" ] && [ -f "$source_root/.oracle-plugin-source-v1" ] && [ ! -L "$source_root/.oracle-plugin-source-v1" ] && [ "$(/bin/cat "$source_root/.oracle-plugin-source-v1")" = OracleSystemPluginInstaller ] || { printf '%s\n' 'A pasta de instalação já existe e não pertence a este instalador. Ela foi preservada.' >&2; return 1; }
  else
    /bin/mkdir -p -- "$(dirname -- "$source_root")"
    /bin/mkdir -m 700 -- "$source_root"
    printf '%s\n' OracleSystemPluginInstaller >"$source_root/.oracle-plugin-source-v1"
  fi
  source_root=$(cd -- "$source_root" && pwd -P)
  [ ! -L "$source_root/versions" ] && [ ! -L "$source_root/.agents" ] && [ ! -L "$source_root/.agents/plugins" ] || { printf '%s\n' 'A pasta de origem foi redirecionada. Instalação interrompida.' >&2; return 1; }
  oracle_run_cli "$scratch/marketplaces.json" 'consultar os plugins locais' "$cli" plugin marketplace list --json
  while market=$(oracle_json "$scratch/marketplaces.json" "marketplaces.$index.name"); do
    if [ "$market" = oracle-system-local ]; then
      existing_root=$(oracle_json "$scratch/marketplaces.json" "marketplaces.$index.root")
      [ "$existing_root" = "$source_root" ] || { printf '%s\n' 'Existe outra fonte oracle-system-local. Ela foi preservada; a instalação foi interrompida.' >&2; return 1; }
    fi
    index=$((index + 1))
  done
  oracle_package_staging=$(/usr/bin/mktemp -d "$source_root/.prepare.XXXXXX")
  /usr/bin/ditto -x -k "$installer/plugin.zip" "$oracle_package_staging/unpacked"
  package_root="$oracle_package_staging/unpacked/$name"
  [ "$(oracle_json "$package_root/plugin.json" name)" = "$name" ] && [ "$(oracle_json "$package_root/plugin.json" version)" = "$version" ] || { printf '%s\n' 'A versão do pacote não corresponde ao instalador.' >&2; return 1; }
  /bin/mkdir -p "$source_root/versions"
  if [ -e "$source_root/versions/$version" ] || [ -L "$source_root/versions/$version" ]; then
    [ -d "$source_root/versions/$version" ] && [ ! -L "$source_root/versions/$version" ] && /usr/bin/diff -qr "$package_root" "$source_root/versions/$version" >/dev/null || { printf '%s\n' 'Os arquivos desta versão foram alterados. Eles foram preservados; a instalação foi interrompida.' >&2; return 1; }
  else
    /bin/mv "$package_root" "$source_root/versions/$version"
  fi
  /bin/mkdir -p "$source_root/.agents/plugins"
  printf '{"name":"oracle-system-local","interface":{"displayName":"Oracle System"},"plugins":[{"name":"%s","source":{"source":"local","path":"./versions/%s"}}]}\n' "$name" "$version" >"$oracle_package_staging/marketplace.json"
  /bin/mv "$oracle_package_staging/marketplace.json" "$source_root/.agents/plugins/marketplace.json"
  printf '%s\n' 'Registrando e instalando o plugin no Desktop...'
  oracle_run_cli "$scratch/marketplace.json" 'registrar o plugin local' "$cli" plugin marketplace add "$source_root" --json
  [ "$(oracle_json "$scratch/marketplace.json" marketplaceName)" = oracle-system-local ] || return 1
  oracle_run_cli "$scratch/install.json" 'instalar o plugin local' "$cli" plugin add "$name@oracle-system-local" --json
  [ "$(oracle_json "$scratch/install.json" pluginId)" = "$name@oracle-system-local" ] && [ "$(oracle_json "$scratch/install.json" version)" = "$version" ] || return 1
  printf '\nOracle System %s instalado pelo gerenciador local.\n' "$version"
  printf '%s\n' 'Abra Oracle System em Plugins no ChatGPT/Codex Desktop. Se a lista estiver antiga, reinicie o Desktop.'
  printf '%s\n' 'Você pode apagar a pasta extraída de Downloads. O plugin e seus dados ficam em pastas persistentes.'
  printf '%s\n' 'A licença, a escolha do Obsidian e as permissões são confirmadas dentro do Oracle. Use Atualizações no Oracle para as próximas versões.'
)
