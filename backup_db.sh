#!/bin/bash

# Configurações
DB_SOURCE="/home/anderson/camila/La-trufa/data/dados_la_doces.sqlite"
BACKUP_DIR="/mnt/backup-doces/backups_doceria"
DATE=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="backup_doces_$DATE.sqlite"

# Criar pasta de backup se não existir
mkdir -p "$BACKUP_DIR"

# Realizar a cópia
if cp "$DB_SOURCE" "$BACKUP_DIR/$BACKUP_FILE"; then
    echo "[$DATE] Backup realizado com sucesso: $BACKUP_FILE"
    # Manter apenas os últimos 30 backups para não encher o cartão
    ls -tp "$BACKUP_DIR"/backup_doces_*.sqlite | grep -v '/$' | tail -n +31 | xargs -I {} rm -- "{}"
else
    echo "[$DATE] ERRO ao realizar backup!"
    exit 1
fi
