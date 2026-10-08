// FF143 PAUTAVERO PROXY ESPIAO v1 - Termux :18000 -> http://179.198.108.48:3000
// Loga pedido+resposta COMPLETOS em lobby_log.txt (JSONL).
// Reescreve nas respostas JSON o endereco real deles -> 127.0.0.1:000018000
// pra TODAS as rotas (ver.php, oauth, lobby) passarem pelo proxy e serem logadas.
// Uso: node ff143_pv_proxy.js  (deixa rodando enquanto joga)

const http = require('http');
const fs = require('fs');
const PORT = 18000;
const ALVO_IP = '179.198.108.48';
const ALVO_PORT = 3000;
const LOG = 'lobby_log.txt';
const MEU = '127.0.0.1:000018000'; // porta padded: Java parseia 18000

function agora() { return new Date().toISOString(); }
function loga(o) { try { fs.appendFileSync(LOG, JSON.stringify(o) + '\n'); } catch (e) {} }
function base64(d) {
  try {
    const s = d.toString('utf8');
    const ok = /^[\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]*$/.test(s);
    return ok ? s : Buffer.from(d).toString('base64');
  } catch (e) { return Buffer.from(d).toString('base64'); }
}
// reescreve enderecos deles nos JSON pra tudo voltar pro proxy
function reescreve(corpo) {
  let t = corpo.toString('utf8');
  let n = 0;
  const subs = [
    ['http://179.198.108.48:3000', 'http://' + MEU],
    ['http://179.198.108.48', 'http://' + MEU],
    ['https://api2018.pautavero.com', 'http://' + MEU],
    ['http://api2018.pautavero.com', 'http://' + MEU],
    ['179.198.108.48:3000', MEU]
  ];
  for (const [a, b] of subs) { while (t.includes(a)) { t = t.replace(a, b); n++; } }
  return { buf: Buffer.from(t), n };
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    let corpo = Buffer.concat(chunks);
    const ini = Date.now();
    console.log(`${agora()} ${req.method} ${req.url} (${corpo.length}b)`);

    // CONTA NOVA: uid velho travado na versao antiga -> uid novo
    // o servidor cria a conta na versao atual (1.25.11) e devolve
    // open_id/token novos, que o cliente passa a usar
    if (req.url.includes('/oauth/guest/token/grant') && corpo.includes('uid=')) {
      let t = corpo.toString('utf8');
      const m = t.match(/uid=(\d+)/);
      if (m) {
        let novo = '';
        try { novo = fs.readFileSync('uid_novo.txt', 'utf8').trim(); } catch (e) {}
        if (!novo || novo === m[1]) {
          novo = '9' + String(Math.floor(Math.random() * 1e12)).padStart(12, '0');
          fs.writeFileSync('uid_novo.txt', novo);
        }
        t = t.replace(m[0], 'uid=' + novo);
        corpo = Buffer.from(t);
        console.log('   [conta nova: uid ' + m[1] + ' -> ' + novo + ']');
      }
    }

    const cab = { ...req.headers };
    delete cab.host;
    delete cab['accept-encoding'];
    cab.host = ALVO_IP + ':' + ALVO_PORT;

    const p = { host: ALVO_IP, port: ALVO_PORT, method: req.method, path: req.url, headers: cab };
    const up = http.request(p, ur => {
      const rchunks = [];
      ur.on('data', c => rchunks.push(c));
      ur.on('end', () => {
        let rcorpo = Buffer.concat(rchunks);
        const ct = (ur.headers['content-type'] || '') + '';
        const parece_json = /json|text|javascript/.test(ct) || rcorpo.includes('179.198.108.48') || rcorpo.includes('pautavero');

        // ver.php: casa remote_version com a versao que o CLIENTE pediu
        // (servidor deles pode responder versao de outro projeto e travar o jogo)
        if (req.url.includes('ver.php')) {
          const mv = req.url.match(/[?&]version=([0-9a-zA-Z.]+)/);
          if (mv) {
            let t = rcorpo.toString('utf8');
            const antes = (t.match(/"remote_version":"[^"]*"/) || [''])[0];
            t = t.replace(/"remote_version":"[^"]*"/, '"remote_version":"' + mv[1] + '"');
            rcorpo = Buffer.from(t);
            delete ur.headers['content-length'];
            console.log('   [ver.php] ' + antes + ' -> "remote_version":"' + mv[1] + '"');
          }
        }

        if (parece_json) {
          const r = reescreve(rcorpo);
          if (r.n) console.log(`   [reescrevi ${r.n} enderecos -> proxy]`);
          rcorpo = r.buf;
          delete ur.headers['content-length'];
        }
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
      if (req.url.includes('ver.php')) {
        const mv = req.url.match(/[?&]version=([0-9a-zA-Z.]+)/);
        const v = mv ? mv[1] : '1.43.0';
        const sint = JSON.stringify({ code: 0, is_server_open: true, is_firewall_open: false, billboard_msg: '', remote_version: v, remote_option_version: '1.0.0', cdn_url: 'http://' + MEU + '/', server_url: 'http://' + MEU + '/', is_review_server: false, force_to_restart_app: false, country_code: 'BR', gdpr_version: 2 });
        console.log('   [VER-SINTETICO] servidor deles caiu, respondi eu');
        loga({ t: agora(), rota: req.url, metodo: req.method, tipo: 'VER-SINTETICO', resposta: sint });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(sint);
        return;
      }
      loga({ t: agora(), rota: req.url, metodo: req.method, pedido: base64(corpo), erro: e.message });
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'upstream', detalhe: e.message }));
    });
    if (corpo.length) up.write(corpo);
    up.end();
  });
});

server.listen(PORT, '0.0.0.0', () => console.log('=== FF143 PAUTAVERO PROXY ESPIAO no ar :' + PORT + ' -> http://' + ALVO_IP + ':' + ALVO_PORT + ' ==='));
