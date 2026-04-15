#!/bin/bash

set -e

if [[ "$(uname)" == "Darwin" ]]; then
  DB_PATH="$HOME/Library/Application Support/com.skiller.app/skiller.db"
else
  DB_PATH="$HOME/.config/com.skiller.app/skiller.db"
fi

echo "=== Stopping existing processes ==="
pkill -f skiller 2>/dev/null
pkill -f "npm run tauri" 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 2

echo "=== Cleaning database ==="
rm -f "$DB_PATH" 2>/dev/null

echo "=== Building backend ==="
cd src-tauri
cargo build || exit 1
cd ..

echo "=== Starting Tauri application ==="
echo "Please wait for the application window to open..."
echo ""
npm run tauri:dev
