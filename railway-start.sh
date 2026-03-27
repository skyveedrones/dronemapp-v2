#!/bin/sh

if [ "$SERVICE_TYPE" = "auth" ]; then
  echo "[Railway] Starting Auth Service (auth-only)"
  exec pnpm exec tsx server/auth-only.ts
else
  echo "[Railway] Starting Map App (default)"
  exec pnpm start
fi
