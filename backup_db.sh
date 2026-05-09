#!/bin/bash

# Configurações
BACKUP_DIR="/mnt/backup-doces"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_NAME="backup_ladoces_${TIMESTAMP}.sql"
CONTAINER_NAME="la-doces-v1.1-db"
DB_USER="ladoces_user"
DB_NAME="ladoces_v11"

# Carregar variáveis do .env
export $(grep -v '^#' /home/anderson/camila/La-trufa/.env | xargs)

# Configurações do Telegram
# TELEGRAM_TOKEN e TELEGRAM_CHAT_ID vêm do .env

function enviar_telegram() {
    local mensagem=$1
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        -d text="${mensagem}" \
        -d parse_mode="Markdown" > /dev/null
}

# Garantir que o diretório de backup existe
mkdir -p $BACKUP_DIR

echo "--- [$(date)] Iniciando Backup do Banco de Dados ---"

# Executar pg_dump dentro do container docker
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/$BACKUP_NAME

# Verificar se o comando foi bem sucedido
if [ $? -eq 0 ]; then
    echo "✅ Backup concluído com sucesso: $BACKUP_DIR/$BACKUP_NAME"
    
    # Compactar o backup para economizar espaço
    gzip $BACKUP_DIR/$BACKUP_NAME
    echo "📦 Backup compactado: $BACKUP_DIR/$BACKUP_NAME.gz"
    
    # Remover backups com mais de 7 dias
    find $BACKUP_DIR -name "backup_ladoces_*.sql.gz" -mtime +7 -exec rm {} \;
    echo "🧹 Backups antigos (mais de 7 dias) removidos."
    
    enviar_telegram "✅ *La-trufa: Backup Diário Realizado!*
💾 Arquivo: \`${BACKUP_NAME}.gz\`
📂 Destino: \`Cartão de Memória\`"
else
    echo "❌ ERRO: Falha ao realizar o backup do banco de dados."
    enviar_telegram "🚨 *ALERTA: Falha no Backup!*
O sistema tentou realizar o backup diário mas ocorreu um erro crítico. Verifique o servidor urgentemente."
    exit 1
fi

echo "--- [$(date)] Processo de Backup Finalizado ---"
