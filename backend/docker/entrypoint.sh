#!/bin/sh
set -e

cd /var/www/html

echo "[STMS] Caching config & routes..."
php artisan config:cache
php artisan route:cache
php artisan event:cache

echo "[STMS] Running database migrations..."
php artisan migrate --force

echo "[STMS] Starting PHP-FPM..."
exec "$@"
