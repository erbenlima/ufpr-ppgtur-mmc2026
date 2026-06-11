// ==UserScript==
// @name         Coletor GMaps v6.1 (Dados Completos)
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  Coleta: Autor, Nota, Data, Texto, Resposta, Likes, Credibilidade e Fotos.
// @author       Erben & Gemini
// @match        *://www.google.com/maps/*
// @match        *://www.google.com.br/maps/*
// @match        *://googleusercontent.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let intervaloRolagem;
    let rolando = false;
    let containerAlvo = null;

    // --- PAINEL VISUAL ---
    const painel = document.createElement('div');
    painel.innerHTML = `
        <div style="font-family: Arial, sans-serif; font-size: 13px; color: white;">
            <h3 style="margin: 0 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px;">Extrator UFPR - v6.1</h3>
            <div style="margin-bottom: 5px;">Status: <span id="status_msg" style="color: yellow;">Parado</span></div>
            <div style="margin-bottom: 10px;">Coletados: <span id="contador_visivel" style="font-size: 16px; font-weight: bold; color: #8ab4f8;">0</span></div>

            <button id="btn_iniciar" style="background: #1a73e8; color: white; border: none; padding: 10px; width: 100%; cursor: pointer; border-radius: 4px; font-weight: bold; margin-bottom: 5px;">1. DETECTAR ÁREA</button>
            <button id="btn_rolar" style="background: #e37400; color: white; border: none; padding: 10px; width: 100%; cursor: pointer; border-radius: 4px; font-weight: bold; margin-bottom: 5px; display:none;">2. ROLAR TUDO</button>
            <button id="btn_parar" style="background: #d93025; color: white; border: none; padding: 10px; width: 100%; cursor: pointer; border-radius: 4px; font-weight: bold; display:none;">3. PARAR</button>
            <button id="btn_baixar" style="background: #188038; color: white; border: none; padding: 10px; width: 100%; cursor: pointer; border-radius: 4px; font-weight: bold; margin-top: 5px;">4. BAIXAR EXCEL COMPLETO</button>
        </div>
    `;

    painel.style.position = 'fixed';
    painel.style.top = '80px';
    painel.style.right = '20px';
    painel.style.zIndex = '9999999';
    painel.style.backgroundColor = '#202124';
    painel.style.padding = '15px';
    painel.style.borderRadius = '8px';
    painel.style.width = '210px';
    document.body.appendChild(painel);

    // --- FUNÇÃO DETECTAR ---
    function detectarContainerDeScroll() {
        const review = document.querySelector('.jftiEf');
        if (!review) {
            alert("❌ Erro: Nenhuma avaliação visível.\nPor favor, clique na aba 'Avaliações' do local primeiro.");
            return null;
        }
        let candidato = review.parentElement;
        while (candidato) {
            const estilo = window.getComputedStyle(candidato);
            if ((estilo.overflowY === 'scroll' || estilo.overflowY === 'auto') && candidato.scrollHeight > candidato.clientHeight) {
                return candidato;
            }
            candidato = candidato.parentElement;
            if (candidato === document.body) break;
        }
        return document.querySelector('div[role="feed"]') || document.querySelector('div[role="main"]');
    }

    // --- BOTÃO 1: DETECTAR ---
    document.getElementById('btn_iniciar').addEventListener('click', () => {
        containerAlvo = detectarContainerDeScroll();
        if (containerAlvo) {
            containerAlvo.style.border = "4px solid red";
            document.getElementById('status_msg').innerText = "Área Detectada!";
            document.getElementById('status_msg').style.color = "#00ff00";
            document.getElementById('btn_iniciar').style.display = 'none';
            document.getElementById('btn_rolar').style.display = 'block';
        } else {
            alert("Role a página manualmente um pouco e tente de novo.");
        }
    });

    // --- BOTÃO 2: ROLAR ---
    document.getElementById('btn_rolar').addEventListener('click', () => {
        if (!containerAlvo) return;
        rolando = true;
        document.getElementById('btn_rolar').style.display = 'none';
        document.getElementById('btn_parar').style.display = 'block';
        document.getElementById('status_msg').innerText = "Rolando...";

        intervaloRolagem = setInterval(() => {
            if (!rolando) return;
            containerAlvo.scrollTop = containerAlvo.scrollHeight;

            // Clica em TODOS os botões "Mais" visíveis
            document.querySelectorAll('button.w8nwRe').forEach(btn => btn.click());

            document.getElementById('contador_visivel').innerText = document.querySelectorAll('.jftiEf').length;
        }, 2000);
    });

    // --- BOTÃO 3: PARAR ---
    document.getElementById('btn_parar').addEventListener('click', () => {
        rolando = false;
        clearInterval(intervaloRolagem);
        document.getElementById('btn_parar').style.display = 'none';
        document.getElementById('btn_rolar').style.display = 'block';
        document.getElementById('status_msg').innerText = "Pausado";
        if(containerAlvo) containerAlvo.style.border = "none";
    });

    // --- BOTÃO 4: BAIXAR (EXTRAÇÃO VIA BLOB) ---
    document.getElementById('btn_baixar').addEventListener('click', () => {
        const reviews = document.querySelectorAll('.jftiEf');

        let csvContent = "\uFEFFAutor;Nota;Data;Credibilidade;Curtidas;Fotos_no_Review;Comentario;Resposta_Proprietario\n";

        reviews.forEach(card => {
            try {
                let autor = card.querySelector('.d4r55')?.innerText || "Anônimo";
                let nota = card.querySelector('.kvMYJc')?.getAttribute('aria-label')?.replace(/\D/g, '') || "0";
                let data = card.querySelector('.rsqaWe')?.innerText || "";

                let credibilidade = "";
                let linhasTexto = card.querySelectorAll('div, span');
                for (let elem of linhasTexto) {
                    if (elem.innerText && elem.innerText.includes("·") && (elem.innerText.includes("avaliaç") || elem.innerText.includes("Local Guide"))) {
                        credibilidade = elem.innerText;
                        break;
                    }
                }

                let likes = "0";
                let likeSpan = card.querySelector('span.pkWtMe');
                if (likeSpan) {
                    likes = likeSpan.innerText;
                } else {
                    let btnLike = card.querySelector('button[aria-label*="Curtir"]');
                    if (btnLike && btnLike.innerText.length > 0) likes = btnLike.innerText;
                }

                let fotos = card.querySelectorAll('button[style*="background-image"]').length;
                let texto = card.querySelector('.wiI7pd')?.innerText || "";

                let resposta = "";
                let blocoResposta = card.querySelector('.C8Iyb');
                if (blocoResposta) {
                    let textoResp = blocoResposta.querySelector('.wiI7pd');
                    resposta = textoResp ? textoResp.innerText : blocoResposta.innerText;
                }

                const limpar = (txt) => txt.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""').replace(/;/g, ",");

                csvContent += `"${limpar(autor)}";"${nota}";"${limpar(data)}";"${limpar(credibilidade)}";"${limpar(likes)}";"${fotos}";"${limpar(texto)}";"${limpar(resposta)}"\n`;

            } catch (e) { console.log("Erro ao processar um card:", e); }
        });

        // Abordagem segura para arquivos grandes usando Blob
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "dados_completos_ufpr.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Limpa a memória
    });

})();