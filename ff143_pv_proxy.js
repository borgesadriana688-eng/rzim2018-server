// FF143 PAUTAVERO PROXY ESPIAO v4 - Termux
// :18000 -> 179.198.108.48:3000 (config: /live/ver.php)
// :18001 -> 179.198.108.48:3001 (login/lobby: server_url deles)
// Loga pedido+resposta COMPLETOS em lobby_log.txt (JSONL).
// Reescreve enderecos nas respostas pra voltar pro proxy na porta certa.
// Uso: node ff143_pv_proxy.js

const http = require('http');
const fs = require('fs');
const ALVO_IP = '179.198.108.48';
const LOG = 'lobby_log.txt';

function agora() { return new Date().toISOString(); }
function loga(o) { try { fs.appendFileSync(LOG, JSON.stringify(o) + '\n'); } catch (e) {} }
function base64(d) {
  try {
    const s = d.toString('utf8');
    const ok = /^[\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]*$/.test(s);
    return ok ? s : Buffer.from(d).toString('base64');
  } catch (e) { return Buffer.from(d).toString('base64'); }
}

// reescreve enderecos deles nos JSON pra voltar pro proxy (porta certa)
function reescreve(corpo) {
  let t = corpo.toString('utf8');
  let n = 0;
  const subs = [
    ['http://179.198.108.48:3001', 'http://127.0.0.1:18001'],
    ['http://179.198.108.48:3000', 'http://127.0.0.1:18000'],
    ['179.198.108.48:3001', '127.0.0.1:18001'],
    ['179.198.108.48:3000', '127.0.0.1:18000'],
    ['https://api2018.pautavero.com', 'http://127.0.0.1:18000'],
    ['http://api2018.pautavero.com', 'http://127.0.0.1:18000'],
    ['http://179.198.108.48/', 'http://127.0.0.1:18000/']
  ];
  for (const [a, b] of subs) { while (t.includes(a)) { t = t.replace(a, b); n++; } }
  return { buf: Buffer.from(t), n };
}

function criaProxy(portaLocal, portaAlvo, tag) {
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      let corpo = Buffer.concat(chunks);
      const ini = Date.now();
      console.log(`${agora()} ${tag} ${req.method} ${req.url} (${corpo.length}b)`);

      // CONTA NOVA: uid travado na versao antiga -> uid novo
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
      cab.host = ALVO_IP + ':' + portaAlvo;

      const p = { host: ALVO_IP, port: portaAlvo, method: req.method, path: req.url, headers: cab };
      const up = http.request(p, ur => {
        const rchunks = [];
        ur.on('data', c => rchunks.push(c));
        ur.on('end', () => {
          let rcorpo = Buffer.concat(rchunks);
          const ct = (ur.headers['content-type'] || '') + '';
          const parece_json = /json|text|javascript/.test(ct) || rcorpo.includes('179.198.108.48') || rcorpo.includes('pautavero');

          // ver.php: casa remote_version com a versao que o CLIENTE pediu
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
            t: agora(), rota: req.url, metodo: req.method, porta: portaAlvo,
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
          const sint = JSON.stringify({
            code: 0, is_server_open: true, is_firewall_open: false, billboard_msg: '',
            remote_version: v, remote_option_version: '1.0.0',
            cdn_url: 'https://dl.cdn.freefiremobile.com/live/ABHotUpdates/',
            server_url: 'http://127.0.0.1:18001/',
            is_review_server: false, force_to_restart_app: false,
            country_code: 'BR', gdpr_version: 2
          });
          console.log('   [VER-SINTETICO] servidor deles caiu, respondi eu');
          loga({ t: agora(), rota: req.url, metodo: req.method, tipo: 'VER-SINTETICO', resposta: sint });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(sint);
          return;
        }
        loga({ t: agora(), rota: req.url, metodo: req.method, porta: portaAlvo, pedido: base64(corpo), erro: e.message });
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: 'upstream', detalhe: e.message }));
      });
      if (corpo.length) up.write(corpo);
      up.end();
    });
  });
  server.listen(portaLocal, '0.0.0.0', () =>
    console.log(`=== FF143 PV PROXY v4 ${tag} :${portaLocal} -> http://${ALVO_IP}:${portaAlvo} ===`));
}

criaProxy(18000, 3000, '[cfg]');
criaProxy(18001, 3001, '[login]');
