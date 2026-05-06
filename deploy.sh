#!/bin/bash
# Script de deploy para o projeto La-trufa
# Este script faz o pull do git, reconstrói a imagem Docker e reinicia o container.

PROJECT_DIR="/home/anderson/camila/La-trufa"
IMAGE_NAME="la-doces"
CONTAINER_NAME="la-doces-app"
PORT=3000
BRANCH="first"

cd $PROJECT_DIR || exit

echo "--- [$(date)] Iniciando atualização ---"

# Tentar fazer o pull (assumindo que as credenciais estão configuradas ou o repo é público)
git fetch origin $BRANCH
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL" != "$REMOTE" ] || [ "$1" == "--force" ]; then
    echo "Mudanças detectadas ou deploy forçado. Atualizando..."
    git pull origin $BRANCH

    echo "Reconstruindo imagem Docker..."
    docker build -t $IMAGE_NAME .

    echo "Reiniciando container..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true

    # Rodar o container com as configurações do docker-compose original
    docker run -d \
      --name $CONTAINER_NAME \
      --restart unless-stopped \
      -p $PORT:$PORT \
      --env-file .env \
      -v "$PROJECT_DIR/data:/usr/src/app/data" \
      $IMAGE_NAME

    echo "--- Deploy finalizado com sucesso ---"
else
    echo "Nenhuma mudança detectada no Git."
fi
