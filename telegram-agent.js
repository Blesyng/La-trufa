const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configurações (Carregadas do .env)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = parseInt(process.env.TELEGRAM_CHAT_ID);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Inicializar APIs
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

console.log("🤖 Agente Telegram La-trufa iniciado...");

// Função para executar comandos no terminal
function executeShell(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve(`❌ Erro: ${error.message}\n${stderr}`);
            } else {
                resolve(stdout || "✅ Comando executado (sem saída).");
            }
        });
    });
}

// Logica do Agente IA
async function processAI(text) {
    const prompt = `Você é um administrador de servidor especializado no projeto "La-trufa". 
    Você tem acesso ao terminal Linux do servidor.
    O projeto está em /home/anderson/camila/La-trufa.
    
    Se o usuário pedir para fazer algo técnico (ex: ver logs, status do docker, listar arquivos, ver uso de memória), 
    responda APENAS com o comando shell necessário entre tags <cmd>comando</cmd>.
    Exemplo: <cmd>docker ps</cmd>
    
    Se o usuário fizer uma pergunta geral, responda de forma curta e profissional.
    
    O usuário disse: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Segurança: Só responde a VOCÊ
    if (chatId !== CHAT_ID) {
        bot.sendMessage(chatId, "🚫 Acesso Negado. Este bot é privado.");
        return;
    }

    bot.sendChatAction(chatId, 'typing');

    try {
        // 1. Passa o pedido pela IA
        const aiResponse = await processAI(text);
        
        // 2. Verifica se a IA sugeriu um comando
        const cmdMatch = aiResponse.match(/<cmd>(.*?)<\/cmd>/);
        
        if (cmdMatch) {
            const command = cmdMatch[1];
            bot.sendMessage(chatId, `⏳ Executando: \`${command}\`...`, { parse_mode: 'Markdown' });
            
            const output = await executeShell(command);
            
            // Envia o resultado do comando
            const finalMsg = `📄 *Resultado:* \n\`\`\`\n${output.substring(0, 3500)}\n\`\`\``;
            bot.sendMessage(chatId, finalMsg, { parse_mode: 'Markdown' });
        } else {
            // Se não for comando, apenas responde o texto da IA
            bot.sendMessage(chatId, aiResponse);
        }
    } catch (error) {
        console.error("Erro no Agente:", error);
        bot.sendMessage(chatId, "⚠️ Erro ao processar IA: " + error.message);
    }
});
