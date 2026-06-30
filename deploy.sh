#!/bin/sh
set -e

echo "→ Baixando imagens..."
docker compose -f docker-compose.prod.yml pull

echo "→ Subindo serviços..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "✅ Deploy concluído!"
echo "   Web:  http://localhost:80"
echo "   API:  http://localhost:3333"
