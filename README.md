# 🧁 La-Doces: Gestão de Vendas e Precificação

Um sistema web completo, focado no cliente (client-side), desenvolvido para gerenciar a produção, precificação e as encomendas de um negócio artesanal de trufas e doces. 

O projeto foi desenhado para ser leve, rápido e não depender de bancos de dados complexos, utilizando o armazenamento local do navegador e sendo facilmente integrado a fluxos de CI/CD em servidores locais.

## ✨ Funcionalidades

* **📋 Gestão de Receitas e Ingredientes:** Cadastro de receitas com cálculo automático de custo real baseado no peso da embalagem e quantidade utilizada.
* **💰 Precificação Inteligente:** Cálculo de custo de produção incluindo valor da hora de trabalho, custos fixos (água, luz, gás) e margem de lucro, gerando o preço de venda ideal.
* **🛒 Controle de Encomendas (Pedidos):** Gerenciamento de status de pedidos (Pendente, Entregue, Pago) com botão direto para envio de recibo e cobrança via WhatsApp.
* **📊 Dashboard Financeiro:** Acompanhamento mensal de lucros, faturamento e custos (incluindo lançamento de gastos avulsos), com visualização em gráficos dinâmicos.
* **🎨 Temas Personalizáveis:** Suporte nativo aos modos Claro (☀️), Escuro (🌙) e Alto Contraste (🌑).
* **💾 Persistência de Dados e Backup:** Os dados são salvos localmente (`localStorage`), com opção de exportar e importar backups completos em formato `.json`.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3 (com variáveis nativas) e JavaScript (Vanilla).
* **Gráficos:** [Chart.js](https://www.chartjs.org/) via CDN.
* **IA Assisted Development:** Toda a lógica de negócios, design responsivo e automações foram desenvolvidas em conjunto com o **Gemini CLI**, acelerando o fluxo de engenharia de software e a criação de scripts de deploy.

## 🚀 Como Executar o Projeto

Como a aplicação é totalmente baseada no lado do cliente, existem duas formas de utilizá-la:

### 1. Execução Local (Simples)
Basta clonar o repositório e abrir o arquivo principal no seu navegador:
```bash
git clone [https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git](https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git)
cd NOME_DO_REPOSITORIO
# Abra o arquivo index.html no navegador
