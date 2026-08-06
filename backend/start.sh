#!/usr/bin/env bash
set -euo pipefail

# Run from the directory holding this script, so the command works whether
# Render's Root Directory is the repo root or `backend`.
cd "$(dirname "$0")"

exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout 120 \
  --access-logfile -
