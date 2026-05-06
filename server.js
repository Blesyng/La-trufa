const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(__dirname));

// Inicializar tabelas (Fase 2)
const initDb = async (retries = 5) => {
  while (retries) {
    try {
      // Tabela genérica para compatibilidade (pedidos, gastos)
      await pool.query(`CREATE TABLE IF NOT EXISTS store (
        key TEXT PRIMARY KEY,
        value JSONB
      )`);

      // Tabela de Usuários (Multi-user)
      await pool.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Criar usuário admin padrão se não existir (Senha: ADMIN_PASSWORD do .env)
      const adminExists = await pool.query("SELECT * FROM users WHERE username = 'admin'");
      if (adminExists.rows.length === 0) {
        await pool.query(
          "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
          ['admin', process.env.ADMIN_PASSWORD || '2903', 'admin']
        );
        console.log('👤 Usuário Admin padrão criado.');
      }

      // Tabela de Clientes (CRM)
      await pool.query(`CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        birthday DATE,
        address TEXT,
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tabela de Despensa (Ingredientes Globais)
      await pool.query(`CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        package_size DECIMAL(10,2) NOT NULL,
        unit TEXT NOT NULL,
        min_stock DECIMAL(10,2) DEFAULT 0,
        current_stock DECIMAL(10,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tabela de Histórico de Preços
      await pool.query(`CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
        price DECIMAL(10,2) NOT NULL,
        package_size DECIMAL(10,2) NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tabela de Receitas (v1.1 Expandida)
      await pool.query(`CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'Outros',
        prep_time INTEGER DEFAULT 0,
        hourly_rate DECIMAL(10,2) DEFAULT 0,
        indirect_cost_pct DECIMAL(10,2) DEFAULT 10,
        profit_margin DECIMAL(10,2) DEFAULT 100,
        allergens TEXT DEFAULT '',
        calories INTEGER DEFAULT 0,
        shelf_life_days INTEGER DEFAULT 7,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Itens da Receita (Snapshot)
      await pool.query(`CREATE TABLE IF NOT EXISTS recipe_items (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        ingredient_id INTEGER REFERENCES ingredients(id),
        amount DECIMAL(10,2) NOT NULL,
        unit TEXT NOT NULL,
        price_at_time DECIMAL(10,2) NOT NULL,
        package_size_at_time DECIMAL(10,2) NOT NULL
      )`);

      console.log('✅ Banco de Dados PostgreSQL inicializado com sucesso.');
      break;
    } catch (err) {
      console.error(`❌ Erro ao conectar ao banco (Tentativas restantes: ${retries}):`, err.message);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

initDb();

// Middleware de Autenticação
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === process.env.TOKEN_SECRET) {
        next();
    } else {
        res.status(401).json({ error: 'Não autorizado' });
    }
};

// Rotas da API (v1.1)

// Rota de Login (v1.2 Multi-user)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Suporte para login antigo (apenas senha)
        if (!username && password === process.env.ADMIN_PASSWORD) {
            return res.json({ success: true, token: process.env.TOKEN_SECRET, role: 'admin', user: 'admin' });
        }

        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (user.password === password) {
                res.json({ 
                    success: true, 
                    token: process.env.TOKEN_SECRET, 
                    role: user.role,
                    user: user.username 
                });
            } else {
                res.status(401).json({ success: false, message: 'Senha incorreta' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Usuário não encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Rotas de Usuários (Admin Only) ---
app.get('/api/users', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY username');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authenticate, async (req, res) => {
    const { username, password, role } = req.body;
    try {
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [username, password, role || 'user']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM users WHERE id = $1 AND username != $2', [id, 'admin']);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Rotas de Compatibilidade (Store) ---
app.get('/api/store/:key', authenticate, async (req, res) => {
    const key = req.params.key;
    try {
        const result = await pool.query("SELECT value FROM store WHERE key = $1", [key]);
        if (result.rows.length > 0) {
            res.json(result.rows[0].value);
        } else {
            res.json(null);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/store/:key', authenticate, async (req, res) => {
    const key = req.params.key;
    const value = req.body;
    try {
        await pool.query(
            "INSERT INTO store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
            [key, JSON.stringify(value)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Rotas de Clientes (CRM) ---
app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/clients', async (req, res) => {
    const { name, phone, birthday, address, notes } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO clients (name, phone, birthday, address, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, phone, birthday || null, address, notes]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM clients WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Rotas de Despensa ---
app.get('/api/ingredients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ingredients ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ingredients', async (req, res) => {
    const { name, price, package_size, unit } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO ingredients (name, price, package_size, unit) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, price, package_size, unit]
        );
        const newIng = result.rows[0];
        
        // Salvar no histórico
        await pool.query(
            'INSERT INTO price_history (ingredient_id, price, package_size) VALUES ($1, $2, $3)',
            [newIng.id, price, package_size]
        );
        
        res.json(newIng);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/ingredients/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM ingredients WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar estoque de ingrediente
app.patch('/api/ingredients/:id/stock', async (req, res) => {
    const id = req.params.id;
    const { amount } = req.body; // Quantidade a subtrair (pode ser negativa para adicionar)
    try {
        await pool.query(
            'UPDATE ingredients SET current_stock = current_stock - $1 WHERE id = $2',
            [amount, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Rotas de Receitas (v1.1) ---
app.get('/api/recipes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM recipes');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Servir arquivos do PWA
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'sw.js'));
});

// Servir o App
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'la-doces-app.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🚀 La-Doces v1.1 (TESTE) rodando na porta ${PORT}`);
    console.log(`=========================================`);
});
