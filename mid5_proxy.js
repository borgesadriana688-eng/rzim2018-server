// MID5 PROXY ESPIAO v1 (2022/Pautavero) - Termux :18000 -> https://api.pautavero.com
// Loga pedido+resposta COMPLETOS em lobby_log.txt (JSONL, uma linha por chamada).
// Uso: node mid5_proxy.js  (deixa rodando enquanto joga)

const http = require('http');
const https = require('https');
const fs = require('fs');
const PORT = 18000;
const ALVO = 'api.pautavero.com';
const LOG = 'lobby_log.txt';

function agora() { return new Date().toISOString(); }
function loga(o) {
  try { fs.appendFileSync(LOG, JSON.stringify(o) + '\n'); } catch (e) {}
}
function base64(d) {
  try {
    const s = d.toString('utf8');
    // se for texto puro (json/xml/texto), guarda direto pra facilitar leitura
    const ok = /^[\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]*$/.test(s);
    return ok ? s : Buffer.from(d).toString('base64');
  } catch (e) { return Buffer.from(d).toString('base64'); }
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const corpo = Buffer.concat(chunks);
    const ini = Date.now();
    console.log(`${agora()} ${req.method} ${req.url} (${corpo.length}b)`);

    const cab = { ...req.headers };
    delete cab.host;
    delete cab['accept-encoding'];
    cab.host = ALVO;

    const p = {
      host: ALVO, port: 443, method: req.method, path: req.url, headers: cab,
      servername: ALVO
    };
    const up = https.request(p, ur => {
      const rchunks = [];
      ur.on('data', c => rchunks.push(c));
      ur.on('end', () => {
        const rcorpo = Buffer.concat(rchunks);
        console.log(`   -> ${ur.statusCode} ${rcorpo.length}b em ${Date.now() - ini}ms`);
        loga({
          t: agora(), rota: req.url, metodo: req.method,
          pedido: base64(corpo), pedido_headers: req.headers,
          status: ur.statusCode, resposta: base64(rcorpo),
          resposta_headers: ur.headers, ms: Date.now() - ini
        });
        res.writeHead(ur.statusCode, ur.headers);
        res.end(rcorpo);
      });
    });
    up.on('error', e => {
      console.log(`   ERRO upstream: ${e.message}`);
      loga({ t: agora(), rota: req.url, metodo: req.method, pedido: base64(corpo), erro: e.message });
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'upstream', detalhe: e.message }));
    });
    if (corpo.length) up.write(corpo);
    up.end();
  });
});

server.listen(PORT, '0.0.0.0', () => console.log('=== MID5 PROXY ESPIAO no ar :' + PORT + ' -> https://' + ALVO + ' ==='));
