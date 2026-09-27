#!/bin/sh
set -e

# ---------------------------------------------------------------------------
# 1. As root: prepare writable volumes, then re-exec this script as `node`.
# ---------------------------------------------------------------------------
if [ "$(id -u)" = '0' ]; then
    mkdir -p /app/uploads /app/secrets
    chown -R node:node /app/uploads /app/secrets 2>/dev/null || true
    chmod 775 /app/uploads 2>/dev/null || true
    chmod 700 /app/secrets 2>/dev/null || true
    exec su-exec node "$0" "$@"
fi

# ---------------------------------------------------------------------------
# 2. Secrets: if JWT_SECRET / COOKIE_SECRET are not provided, generate random
#    values on first boot and persist them in the secrets volume so sessions
#    survive restarts. Explicitly provided values always win.
# ---------------------------------------------------------------------------
SECRETS_DIR=/app/secrets

load_or_generate_secret() {
    name="$1"
    eval "current=\${$name:-}"
    if [ -n "$current" ]; then
        return 0
    fi
    file="$SECRETS_DIR/$name"
    if [ ! -s "$file" ]; then
        umask 077
        node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))" > "$file"
        echo "[entrypoint] Generated a new random $name (stored in the secrets volume)."
    fi
    eval "export $name=\"\$(cat \"$file\")\""
}

load_or_generate_secret JWT_SECRET
load_or_generate_secret COOKIE_SECRET

# ---------------------------------------------------------------------------
# 3. Database: apply committed migrations, then seed demo data. The seeder is
#    a no-op when the database already contains data or SEED_DEMO_DATA=false.
# ---------------------------------------------------------------------------
if [ "$1" = 'node' ] && [ "$2" = 'dist/server.js' ]; then
    npx prisma migrate deploy
    node dist/seed/demo-seed.js
fi

exec "$@"
