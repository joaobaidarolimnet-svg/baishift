#!/bin/zsh
# Renderiza uma página local em PNG usando o Chrome headless.
# uso: shot.sh <arquivo.html> <saida.png> <largura> <altura>
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC="$1"; OUT="$2"; W="$3"; H="$4"
PROF=$(mktemp -d)
rm -f "$OUT"
"$CHROME" --headless --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
  --user-data-dir="$PROF" --virtual-time-budget=5000 \
  --window-size="$W,$H" --screenshot="$OUT" "file://$(cd "$(dirname "$SRC")" && pwd)/$(basename "$SRC")" \
  >/dev/null 2>&1 &
PID=$!
for i in {1..60}; do
  [[ -s "$OUT" ]] && sleep 0.4 && break
  sleep 0.5
done
kill $PID 2>/dev/null; wait $PID 2>/dev/null
rm -rf "$PROF"
[[ -s "$OUT" ]] && echo "ok  $OUT  ($(wc -c < "$OUT") bytes)" || echo "FALHOU $OUT"
