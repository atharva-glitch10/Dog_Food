#!/bin/sh
set -e

# Ensure uploads directory exists and is owned by node with proper permissions
mkdir -p /app/uploads
chown -R node:node /app/uploads 2>/dev/null || true
chmod 775 /app/uploads 2>/dev/null || true

# If container starts as root, drop privileges to the non-root node user
if [ "$(id -u)" = '0' ]; then
    exec su-exec node "$@"
else
    exec "$@"
fi
