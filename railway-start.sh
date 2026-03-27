#!/bin/sh

# Always build before starting
echo "[Railway] Running build step..."
pnpm install --frozen-lockfile
pnpm run build

# Check for build output
if [ ! -f dist/public/index.html ]; then
  echo "[Railway] ERROR: dist/public/index.html not found after build. Exiting."
  exit 1
fi

if [ "$SERVICE_TYPE" = "auth" ]; then
  echo "[Railway] Starting Auth Service (auth-only)"
  exec pnpm exec tsx server/auth-only.ts
else
  echo "[Railway] Starting Map App (default)"
  exec pnpm start
fi
