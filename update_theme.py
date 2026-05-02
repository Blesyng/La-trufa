import re

with open('la-doces-app.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update root variables and add data-themes
root_css = """        :root {
            --cor-fundo: #f9fafb;
            --cor-fundo-painel: #ffffff;
            --cor-principal: #111827;
            --cor-secundaria: #4b5563;
            --cor-destaque: #db2777; /* Rosa moderno para doceria */
            --cor-destaque-hover: #be185d;
            --cor-borda: #e5e7eb;
            --cor-sucesso: #10b981;
            --cor-erro: #ef4444;
            
            --cor-fundo-alt: #f3f4f6;
            --cor-fundo-fieldset: #fafafa;
            --cor-fundo-tabela-header: #f9fafb;
            --cor-fundo-tabela-hover: #f9fafb;
            
            --cor-fundo-sucesso-light: #e8f5e9;
            --cor-borda-sucesso: #2e7d32;
            --cor-texto-sucesso: #2e7d32;
            
            --cor-fundo-erro-light: #ffebee;
            --cor-borda-erro: #c62828;
            --cor-texto-erro: #c62828;
            
            --cor-fundo-info-light: #e3f2fd;
            --cor-borda-info: #1565c0;
            --cor-texto-info: #1565c0;

            --cor-fundo-destaque-light: #fdf2f8;
            --cor-borda-destaque-light: #fbcfe8;

            --cor-tabs: rgba(255, 255, 255, 0.95);

            --sombra-card: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --sombra-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --raio-borda: 12px;
            --raio-borda-sm: 8px;
        }

        [data-theme="dark"] {
            --cor-fundo: #111827;
            --cor-fundo-painel: #1f2937;
            --cor-principal: #f9fafb;
            --cor-secundaria: #9ca3af;
            --cor-destaque: #f43f5e;
            --cor-destaque-hover: #e11d48;
            --cor-borda: #374151;
            --cor-fundo-alt: #111827;
            --cor-fundo-fieldset: #1f2937;
            --cor-fundo-tabela-header: #111827;
            --cor-fundo-tabela-hover: #374151;
            
            --cor-fundo-sucesso-light: #064e3b;
            --cor-borda-sucesso: #34d399;
            --cor-texto-sucesso: #34d399;
            
            --cor-fundo-erro-light: #7f1d1d;
            --cor-borda-erro: #f87171;
            --cor-texto-erro: #f87171;
            
            --cor-fundo-info-light: #1e3a8a;
            --cor-borda-info: #60a5fa;
            --cor-texto-info: #60a5fa;

            --cor-fundo-destaque-light: #831843;
            --cor-borda-destaque-light: #f43f5e;

            --cor-tabs: rgba(31, 41, 55, 0.95);

            --sombra-card: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
            --sombra-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
        }

        [data-theme="black"] {
            --cor-fundo: #000000;
            --cor-fundo-painel: #0a0a0a;
            --cor-principal: #ffffff;
            --cor-secundaria: #a3a3a3;
            --cor-destaque: #ff2473;
            --cor-destaque-hover: #e00052;
            --cor-borda: #262626;
            --cor-fundo-alt: #000000;
            --cor-fundo-fieldset: #0a0a0a;
            --cor-fundo-tabela-header: #000000;
            --cor-fundo-tabela-hover: #171717;

            --cor-fundo-sucesso-light: #002b12;
            --cor-borda-sucesso: #10b981;
            --cor-texto-sucesso: #10b981;
            
            --cor-fundo-erro-light: #3b0000;
            --cor-borda-erro: #ef4444;
            --cor-texto-erro: #ef4444;
            
            --cor-fundo-info-light: #00153b;
            --cor-borda-info: #3b82f6;
            --cor-texto-info: #3b82f6;

            --cor-fundo-destaque-light: #3b001a;
            --cor-borda-destaque-light: #ff2473;

            --cor-tabs: rgba(10, 10, 10, 0.95);

            --sombra-card: none;
            --sombra-hover: 0 0 15px rgba(255, 36, 115, 0.2);
        }"""

content = re.sub(r'        :root \{.*?\-\-raio\-borda\-sm: 8px;\n        \}', root_css, content, flags=re.DOTALL)

# 2. Replace hardcoded CSS colors
content = content.replace('background-color: #f3f4f6;', 'background-color: var(--cor-fundo-alt);')
content = content.replace('background-color: #fafafa;', 'background-color: var(--cor-fundo-fieldset);')
content = content.replace('background-color: #f9fafb;', 'background-color: var(--cor-fundo-tabela-header);')
content = content.replace('background-color: #fdf2f8;', 'background-color: var(--cor-fundo-destaque-light);')
content = content.replace('border: 1px solid #fbcfe8;', 'border: 1px solid var(--cor-borda-destaque-light);')
content = content.replace('background: rgba(255, 255, 255, 0.95);', 'background: var(--cor-tabs);')

# 3. Add Theme Selector to Header
acoes_header_old = """        <div class="acoes-header">
            <button onclick="exportarBackup()" class="btn-secundario">📥 Exportar</button>
            <button onclick="document.getElementById('importarArquivo').click()" style="background-color: var(--cor-principal); border: 1px solid var(--cor-secundaria);">📤 Importar</button>
            <input type="file" id="importarArquivo" accept=".json" style="display: none;" onchange="importarBackup(event)">
        </div>"""

acoes_header_new = """        <div class="acoes-header">
            <select id="seletorTema" onchange="alterarTema(this.value)" style="padding: 0.5rem; border-radius: var(--raio-borda-sm); background-color: var(--cor-fundo-painel); color: var(--cor-principal); border: 1px solid var(--cor-borda); font-weight: 500; font-size: 0.9rem;">
                <option value="light">☀️ Claro</option>
                <option value="dark">🌙 Escuro (Cinza)</option>
                <option value="black">🌑 Alto Contraste (Preto)</option>
            </select>
            <button onclick="exportarBackup()" class="btn-secundario">📥 Exportar</button>
            <button onclick="document.getElementById('importarArquivo').click()" style="background-color: var(--cor-principal); color: var(--cor-fundo-painel); border: 1px solid var(--cor-secundaria);">📤 Importar</button>
            <input type="file" id="importarArquivo" accept=".json" style="display: none;" onchange="importarBackup(event)">
        </div>"""

content = content.replace(acoes_header_old, acoes_header_new)

# 4. JS: Replace inline colors for Dashboard Cards
dash_cards_old = """                    <div class="preco-final-caixa" style="background-color: #e8f5e9; border-color: #2e7d32; margin-top: 0;">
                        <span style="color: #2e7d32;">Faturamento</span>
                        <div class="preco-final-valor" id="dashFaturamento" style="color: #2e7d32;">R$ 0,00</div>
                    </div>
                    <div class="preco-final-caixa" style="background-color: #ffebee; border-color: #c62828; margin-top: 0;">
                        <span style="color: #c62828;">Custos</span>
                        <div class="preco-final-valor" id="dashCustos" style="color: #c62828;">R$ 0,00</div>
                    </div>
                    <div class="preco-final-caixa" id="caixaLucro" style="background-color: #e3f2fd; border-color: #1565c0; margin-top: 0;">
                        <span id="labelLucro" style="color: #1565c0;">Lucro Líquido</span>
                        <div class="preco-final-valor" id="dashLucro" style="color: #1565c0;">R$ 0,00</div>
                    </div>"""

dash_cards_new = """                    <div class="preco-final-caixa" style="background-color: var(--cor-fundo-sucesso-light); border-color: var(--cor-borda-sucesso); margin-top: 0;">
                        <span style="color: var(--cor-texto-sucesso);">Faturamento</span>
                        <div class="preco-final-valor" id="dashFaturamento" style="color: var(--cor-texto-sucesso);">R$ 0,00</div>
                    </div>
                    <div class="preco-final-caixa" style="background-color: var(--cor-fundo-erro-light); border-color: var(--cor-borda-erro); margin-top: 0;">
                        <span style="color: var(--cor-texto-erro);">Custos</span>
                        <div class="preco-final-valor" id="dashCustos" style="color: var(--cor-texto-erro);">R$ 0,00</div>
                    </div>
                    <div class="preco-final-caixa" id="caixaLucro" style="background-color: var(--cor-fundo-info-light); border-color: var(--cor-borda-info); margin-top: 0;">
                        <span id="labelLucro" style="color: var(--cor-texto-info);">Lucro Líquido</span>
                        <div class="preco-final-valor" id="dashLucro" style="color: var(--cor-texto-info);">R$ 0,00</div>
                    </div>"""

content = content.replace(dash_cards_old, dash_cards_new)

# 5. Update Javascript updating inline styles
js_lucro_old = """        if (lucroLiquido < 0) {
            caixaLucro.style.backgroundColor = '#ffebee';
            caixaLucro.style.borderColor = '#c62828';
            cardLucro.style.color = '#c62828';
            labelLucro.style.color = '#c62828';
            labelLucro.innerText = 'Prejuízo';
        } else {
            caixaLucro.style.backgroundColor = '#e3f2fd';
            caixaLucro.style.borderColor = '#1565c0';
            cardLucro.style.color = '#1565c0';
            labelLucro.style.color = '#1565c0';
            labelLucro.innerText = 'Lucro Líquido';
        }"""

js_lucro_new = """        if (lucroLiquido < 0) {
            caixaLucro.style.backgroundColor = 'var(--cor-fundo-erro-light)';
            caixaLucro.style.borderColor = 'var(--cor-borda-erro)';
            cardLucro.style.color = 'var(--cor-texto-erro)';
            labelLucro.style.color = 'var(--cor-texto-erro)';
            labelLucro.innerText = 'Prejuízo';
        } else {
            caixaLucro.style.backgroundColor = 'var(--cor-fundo-info-light)';
            caixaLucro.style.borderColor = 'var(--cor-borda-info)';
            cardLucro.style.color = 'var(--cor-texto-info)';
            labelLucro.style.color = 'var(--cor-texto-info)';
            labelLucro.innerText = 'Lucro Líquido';
        }"""

content = content.replace(js_lucro_old, js_lucro_new)

# 6. Add Theme logic in JS
js_dom_loaded = "document.addEventListener('DOMContentLoaded', () => {"
js_theme_logic = """    function alterarTema(tema) {
        document.documentElement.setAttribute('data-theme', tema);
        localStorage.setItem('appTrufas_tema', tema);
        
        // Atualiza gráficos se existirem
        if (typeof analisarVendas === 'function' && document.getElementById('analiseVendas').style.display !== 'none') {
            analisarVendas();
        }
        if (typeof atualizarDashboardFinanceiro === 'function') {
            atualizarDashboardFinanceiro();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const temaSalvo = localStorage.getItem('appTrufas_tema') || 'light';
        document.documentElement.setAttribute('data-theme', temaSalvo);
        const seletorTema = document.getElementById('seletorTema');
        if (seletorTema) seletorTema.value = temaSalvo;
"""

content = content.replace(js_dom_loaded, js_theme_logic)

# 7. Update Chart Colors to respond to Theme (Optional, but good for contrast)
chart_old = "borderColor: 'var(--cor-fundo)',"
chart_new = """borderColor: getComputedStyle(document.documentElement).getPropertyValue('--cor-fundo').trim(),"""
content = content.replace(chart_old, chart_new)


with open('la-doces-app.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
