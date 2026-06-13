#!/bin/bash
# Gitai Earthmovers — start standalone app (Mac/Linux)
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
PORT=8080

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Server already running on http://localhost:$PORT"
else
  echo "Starting server on http://localhost:$PORT ..."
  python3 -m http.server $PORT &
  sleep 1
fi

if command -v open >/dev/null 2>&1; then
  open "http://localhost:$PORT"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:$PORT"
else
  echo "Open http://localhost:$PORT in your browser"
fi

echo ""
echo "Login: admin / admin123"
echo "Database: Gitai.xlsx (in this folder)"
echo "Press Ctrl+C to stop the server when done."

wait
