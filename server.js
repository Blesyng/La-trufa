const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurações do Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function notifyTelegram(message) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
    } catch (err) {
        console.error("Erro ao enviar notificação Telegram:", err.message);
    }
}

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

// Serve apenas arquivos públicos específicos para evitar vazamento de código e .env
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'manifest.json')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'sw.js')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'la-doces-app.html')));
app.get('/la-doces-app.html', (req, res) => res.sendFile(path.join(__dirname, 'la-doces-app.html')));

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
        name TEXT UNIQUE NOT NULL,
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
        name TEXT UNIQUE NOT NULL,
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

// Middleware de Autenticação (JWT)
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    // Mantém compatibilidade com o token legado (temporário)
    if (token === process.env.TOKEN_SECRET) {
        return next();
    }

    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido ou expirado' });
        req.user = user;
        next();
    });
};

// Rotas da API (v1.1)

// Rota de Login (JWT + bcrypt)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Suporte para login legado (admin password do .env)
        if (!username && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign({ username: 'admin', role: 'admin' }, process.env.TOKEN_SECRET, { expiresIn: '24h' });
            return res.json({ success: true, token: token, role: 'admin', user: 'admin' });
        }

        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);
            
            if (match || user.password === password) { // Fallback para senha em texto puro (migração)
                if (user.password === password) {
                    const hashed = await bcrypt.hash(password, 10);
                    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, user.id]);
                }
                const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.TOKEN_SECRET, { expiresIn: '24h' });
                res.json({ 
                    success: true, 
                    token: token, 
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
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [username, hashedPassword, role || 'user']
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
app.get('/api/clients', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/clients', authenticate, async (req, res) => {
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

app.delete('/api/clients/:id', authenticate, async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM clients WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Rotas de Despensa ---
app.get('/api/ingredients', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ingredients ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ingredients', authenticate, async (req, res) => {
    const { name, price, package_size, unit, min_stock, current_stock } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO ingredients (name, price, package_size, unit, min_stock, current_stock) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET price = $2, package_size = $3, unit = $4, min_stock = $5, current_stock = $6 RETURNING *',
            [name, price, package_size, unit, min_stock || 0, current_stock || 0]
        );
        const newIng = result.rows[0];
        
        await pool.query(
            'INSERT INTO price_history (ingredient_id, price, package_size) VALUES ($1, $2, $3)',
            [newIng.id, price, package_size]
        );
        
        res.json(newIng);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/ingredients/:id', authenticate, async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM ingredients WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/ingredients/:id/stock', authenticate, async (req, res) => {
    const id = req.params.id;
    const { amount } = req.body;
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

// --- Rotas de Receitas (Relacional v1.2) ---

// Obter todas as receitas (com seus ingredientes)
app.get('/api/recipes', authenticate, async (req, res) => {
    try {
        const recipesResult = await pool.query('SELECT * FROM recipes ORDER BY name');
        const recipes = recipesResult.rows;

        // Para cada receita, buscar seus itens/ingredientes
        for (let recipe of recipes) {
            const itemsResult = await pool.query(`
                SELECT ri.*, i.name as ingredient_name 
                FROM recipe_items ri 
                LEFT JOIN ingredients i ON ri.ingredient_id = i.id 
                WHERE ri.recipe_id = $1`, 
                [recipe.id]
            );
            recipe.ingredients = itemsResult.rows;
        }
        
        res.json(recipes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Salvar/Criar Receita Completa
app.post('/api/recipes', authenticate, async (req, res) => {
    const { 
        name, category, prep_time, hourly_rate, indirect_cost_pct, 
        profit_margin, allergens, calories, shelf_life_days, ingredients 
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Inserir ou atualizar a receita principal
        const recipeResult = await client.query(`
            INSERT INTO recipes (
                name, category, prep_time, hourly_rate, indirect_cost_pct, 
                profit_margin, allergens, calories, shelf_life_days
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (name) DO UPDATE SET 
                category = $2, prep_time = $3, hourly_rate = $4, 
                indirect_cost_pct = $5, profit_margin = $6, allergens = $7, 
                calories = $8, shelf_life_days = $9
            RETURNING id`,
            [name, category, prep_time, hourly_rate, indirect_cost_pct, profit_margin, allergens, calories, shelf_life_days]
        );

        const recipeId = recipeResult.rows[0].id;

        // 2. Limpar itens antigos (para atualização)
        await client.query('DELETE FROM recipe_items WHERE recipe_id = $1', [recipeId]);

        // 3. Inserir novos itens
        if (ingredients && ingredients.length > 0) {
            for (let item of ingredients) {
                // Tenta encontrar o ID do ingrediente pelo nome se não foi fornecido
                let ingredientId = item.ingredient_id;
                if (!ingredientId) {
                    const ingLookup = await client.query('SELECT id FROM ingredients WHERE name = $1', [item.nome]);
                    if (ingLookup.rows.length > 0) ingredientId = ingLookup.rows[0].id;
                }

                await client.query(`
                    INSERT INTO recipe_items (
                        recipe_id, ingredient_id, amount, unit, 
                        price_at_time, package_size_at_time
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [recipeId, ingredientId, item.qtdUsada || item.amount, item.unidadeUsada || item.unit, item.precoEmb || item.price_at_time, item.pesoEmb || item.package_size_at_time]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, id: recipeId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.delete('/api/recipes/:id', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM recipes WHERE id = $1', [req.params.id]);
        res.json({ success: true });
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
    notifyTelegram(`🚀 *La-trufa Online!* \nO servidor foi iniciado com sucesso na porta ${PORT}.`);
});
