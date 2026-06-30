#!/bin/sh
set -e

PRISMA=./node_modules/.bin/prisma

echo "→ Instalando extensões do banco..."
printf "CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;" | $PRISMA db execute --stdin

echo "→ Aplicando migrations..."
$PRISMA migrate deploy

echo "→ Seedando base..."
node prisma/seed.js

echo "→ Iniciando API..."
exec "$@"
