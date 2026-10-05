#!/bin/sh
set -eu
portable_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
case "$(/usr/bin/uname -s):$(/usr/bin/uname -m)" in
  Darwin:arm64) ;;
  *) echo 'Este experimento requer macOS Apple Silicon.' >&2; exit 1 ;;
esac
portable_data=${ORACLE_PORTABLE_PLUGIN_DATA:-${PLUGIN_DATA:-}}
case "$portable_data" in
  /*) ;;
  *) echo 'PLUGIN_DATA deve ser uma pasta absoluta fornecida pelo host.' >&2; exit 1 ;;
esac
case "$portable_data" in
  *'${PLUGIN_DATA}'*) echo 'O host não expandiu PLUGIN_DATA.' >&2; exit 1 ;;
esac
export ORACLE_PORTABLE_PLUGIN_DATA="$portable_data"
exec "$portable_root/runtime/bun" --no-env-file --no-install "$portable_root/runtime-payload.mjs"
