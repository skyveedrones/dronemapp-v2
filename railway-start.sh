#!/bin/sh

echo "[Railway] Startup Sequence Initiated..."
echo "[Railway] Current Directory: $(pwd)"

# Run a radar scan to find exactly where Vite put the files
echo "[Railway] Scanning for index.html..."
find . -name "index.html" | grep -v "node_modules" || echo "No index.html found in tree!"

# Start the servers (letting Express handle 404s naturally if they happen)
if [ "$SERVICE_TYPE" = "auth" ]; then
  echo "[Railway] Starting Auth Service (auth-only)"
  # Execute the auth server directly
  exec node dist/server/auth-only.js
else
  echo "[Railway] Starting Map App (default)"
  exec pnpm start
fi
