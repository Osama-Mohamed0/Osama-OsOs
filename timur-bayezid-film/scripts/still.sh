#!/bin/bash
# usage: scripts/still.sh <CompositionId> <frame> [out.png] [scale]
cd "$(dirname "$0")/.."
npx remotion still src/index.ts "$1" "${3:-out/stills/$1_$2.png}" --frame="$2" --scale="${4:-1}" --log=error \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
