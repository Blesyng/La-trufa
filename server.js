const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Configuração de autenticação via variáveis de ambiente
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'fallback-secret';

// Middleware para verificar token
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === TOKEN_SECRET) {
        next();
    } else {
        res.status(401).json({ error: 'Não autorizado' });
    }
};

// Rota de Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: TOKEN_SECRET });
    } else {
        res.status(401).json({ success: false, message: 'Senha incorreta' });
    }
});

// Rota para ler um dado do banco
app.get('/api/store/:key', authenticate, (req, res) => {
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
app.post('/api/store/:key', authenticate, (req, res) => {
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

// --- NOVAS ROTAS PARA O APP ANDROID ---

// Rota simplificada para o App sincronizar tudo sem precisar de login complexo inicialmente
// (Você pode adicionar o middleware 'authenticate' depois se quiser segurança extra)
app.get('/api/app/sync', (req, res) => {
    db.all("SELECT key, value FROM store", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const data = {};
        rows.forEach(row => {
            try {
                data[row.key] = JSON.parse(row.value);
            } catch(e) {
                data[row.key] = row.value;
            }
        });
        res.json(data);
    });
});

// Rota para o App salvar dados específicos (receitas, pedidos, despesas)
app.post('/api/app/save/:key', (req, res) => {
    let key = req.params.key;
    
    // Mapear chaves do Android para as chaves que o Site já usa
    const keyMap = {
        'recipes': 'livroReceitas',
        'orders': 'pedidos',
        'expenses': 'gastos'
    };
    
    if (keyMap[key]) {
        key = keyMap[key];
    }

    const value = JSON.stringify(req.body);

    const query = `
        INSERT INTO store (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `;
    
    db.run(query, [key, value], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: `Dados de ${key} sincronizados` });
    });
});

// --- FIM DAS ROTAS DO APP ---

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
