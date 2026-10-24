#!/bin/bash
# The host owns plugin registration, permissions, cache and persistent data.

oracle_find_cli() {
  local bundle candidate
  for bundle in /Applications/ChatGPT.app /Applications/Codex.app "$HOME/Applications/ChatGPT.app" "$HOME/Applications/Codex.app"; do
    [ -d "$bundle" ] || continue
    /usr/bin/codesign --verify --deep --strict --test-requirement '=anchor apple generic and certificate leaf[subject.OU] = "2DC432GLL2"' "$bundle" >/dev/null 2>&1 || continue
    for candidate in "$bundle/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex" "$bundle/Contents/Resources/codex"; do
      [ -f "$candidate" ] && [ -x "$candidate" ] && [ ! -L "$candidate" ] || continue
      /usr/bin/codesign --verify --strict "$candidate" >/dev/null 2>&1 || continue
      if "$candidate" plugin add --help >/dev/null 2>&1 && "$candidate" plugin marketplace add --help >/dev/null 2>&1; then
        printf '%s\n' "$candidate"
        return 0
      fi
    done
  done
  printf '%s\n' 'Não encontrei um ChatGPT/Codex Desktop atualizado com instalação local de plugins. Atualize o aplicativo e execute este instalador novamente.' >&2
  return 1
}

oracle_json() {
  /usr/bin/plutil -extract "$2" raw -o - "$1" 2>/dev/null
}

oracle_run_cli() {
  local output="$1" stage="$2" cli="$3"
  shift 3
  if "$cli" "$@" >"$output" 2>"$output.error"; then
    return 0
  fi
  printf '\nFalha ao %s. O aplicativo informou:\n' "$stage" >&2
  /bin/cat "$output.error" >&2
  return 1
}

oracle_install() {
  local cli="$1" scratch="$2" index=0 name source kind exists=false version
  local repository='https://github.com/nitroxinteligence/ORACLE-PLUGIN.git'
  oracle_run_cli "$scratch/marketplaces.json" 'consultar as fontes de plugins' "$cli" plugin marketplace list --json || return 1
  # Refuse an unrelated source using the same marketplace name. Never remove it.
  while name=$(oracle_json "$scratch/marketplaces.json" "marketplaces.$index.name"); do
    if [ "$name" = oracle-system ]; then
      source=$(oracle_json "$scratch/marketplaces.json" "marketplaces.$index.marketplaceSource.source") || return 1
      kind=$(oracle_json "$scratch/marketplaces.json" "marketplaces.$index.marketplaceSource.sourceType") || return 1
      if [ "$kind" != git ] || { [ "$source" != "$repository" ] && [ "$source" != "${repository%.git}" ]; }; then
        printf '%s\n' 'Já existe uma fonte chamada oracle-system que não aponta para o GitHub oficial. Ela foi preservada. Revise essa fonte no gerenciador de plugins.' >&2
        return 1
      fi
      exists=true
      break
    fi
    index=$((index + 1))
  done
  if [ "$exists" = true ]; then
    printf '%s\n' 'Atualizando a fonte oficial do Oracle...'
    oracle_run_cli "$scratch/marketplace.json" 'atualizar a fonte oficial' "$cli" plugin marketplace upgrade oracle-system --json || return 1
  else
    printf '%s\n' 'Obtendo o plugin do GitHub oficial. Esta etapa pode levar alguns minutos...'
    oracle_run_cli "$scratch/marketplace.json" 'adicionar a fonte oficial' "$cli" plugin marketplace add "$repository" --ref main --sparse .agents/plugins --sparse plugins/oracle-system-mac-stable --json || return 1
    name=$(oracle_json "$scratch/marketplace.json" marketplaceName) || return 1
    [ "$name" = oracle-system ] || { printf '%s\n' 'O aplicativo retornou uma fonte inesperada. Instalação interrompida.' >&2; return 1; }
  fi
  printf '%s\n' 'Instalando o plugin Oracle System...'
  oracle_run_cli "$scratch/install.json" 'instalar o plugin' "$cli" plugin add oracle-system-mac-stable@oracle-system --json || return 1
  name=$(oracle_json "$scratch/install.json" pluginId) || return 1
  version=$(oracle_json "$scratch/install.json" version) || return 1
  [ "$name" = oracle-system-mac-stable@oracle-system ] && [ -n "$version" ] || return 1
  printf '\nOracle System %s instalado pelo gerenciador local.\n' "$version"
  printf '%s\n' 'Feche apenas a janela do Oracle e abra Oracle System em Plugins. Se ele ainda não aparecer, reinicie o ChatGPT/Codex Desktop.'
  printf '%s\n' 'A licença, a escolha do Obsidian e as permissões continuam sendo confirmadas dentro do Oracle.'
}
