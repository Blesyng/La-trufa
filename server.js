const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configurar o Express para JSON e permitir conexões externas (CORS)
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Servir os arquivos estáticos (como o HTML)
app.use(express.static(__dirname));

// Criar pasta data se não existir (necessário para o volume do Docker)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Inicializar banco de dados SQLite
const dbPath = path.join(dataDir, 'dados_la_doces.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS store (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);
    }
});

// Rota para ler um dado do banco
app.get('/api/store/:key', (req, res) => {
    const key = req.params.key;
    db.get("SELECT value FROM store WHERE key = ?", [key], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            try {
                res.json(JSON.parse(row.value));
            } catch(e) {
                res.json(row.value);
            }
        } else {
            res.json(null);
        }
    });
});

// Rota para salvar um dado no banco
app.post('/api/store/:key', (req, res) => {
    const key = req.params.key;
    const value = JSON.stringify(req.body);

    const query = `
        INSERT INTO store (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `;
    
    db.run(query, [key, value], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// Rota principal para servir o App
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'la-doces-app.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`✅ Servidor La-Doces rodando na porta ${PORT}`);
    console.log(`👉 Acesse localmente: http://localhost:${PORT}`);
    console.log(`=========================================`);
});
