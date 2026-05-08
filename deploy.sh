#!/bin/bash
# Script de deploy para o projeto La-trufa (v1.1)
# Este script faz o pull do git e usa docker-compose para atualizar os serviços.

PROJECT_DIR="/home/anderson/camila/La-trufa"
BRANCH="v1.1"

cd $PROJECT_DIR || exit

echo "--- [$(date)] Iniciando atualização (v1.1) ---"

# Sincronizar com o repositório
git fetch origin $BRANCH
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL" != "$REMOTE" ] || [ "$1" == "--force" ]; then
    echo "Mudanças detectadas ou deploy forçado. Atualizando..."
    git pull origin $BRANCH

    echo "Subindo serviços com docker-compose..."
    docker-compose up -d --build

    # Limpar imagens antigas sem uso para economizar espaço
    docker image prune -f

    echo "--- Deploy finalizado com sucesso ---"
else
    echo "Nenhuma mudança detectada no Git."
fi
