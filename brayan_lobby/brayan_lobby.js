// BRAYAN LOBBY 1.43 — servidor independente (replay do corpus capturado em 8/out/2026)
// Roda no Termux: node brayan_lobby.js
// Portas locais: 18000 (ver.php) | 18001 (MajorLogin) | 18002 (24+ rotas do lobby)
// Requisitos: pasta ./caps/ com os cap_XXX_rec.bin + caps_index.json (mesma pasta deste arquivo)
const http = require('http');
const fs = require('fs');
const path = require('path');

const IDX = JSON.parse(fs.readFileSync(path.join(__dirname, 'caps_index.json'), 'utf8'));
function corpo(arq) {
  const rec = fs.readFileSync(path.join(__dirname, 'caps', arq));
  const corte = rec.toString('latin1').indexOf('\r\n\r\n');
  return rec.slice(corte + 4);
}

// --- resposta capturada do MajorLogin (ja aponta lobby pra 127.0.0.1:18002) ---
const MAJORLOGIN = Buffer.from(
  '08bfade204120242521a024252220242522a046c697665320242523a02425242306135633739396637383561383037363136346535613330653834393936646565613663373339393038366239643964354880e101521a687474703a2f2f3132372e302e302e313a3030303031383030326000', 'hex');

const VER = JSON.stringify({
  appstore_url: 'https://play.google.com/store/apps/details?id=com.dts.freefireth',
  billboard_msg: '', cdn_url: 'https://dl.cdn.freefiremobile.com/live/ABHotUpdates/',
  client_ip: '127.0.0.1', code: 0, country_code: 'BR', force_to_restart_app: false,
  gdpr_version: 2, is_firewall_open: false, is_review_server: false, is_server_open: true,
  maintenance_announcement: '', maintenance_region_id: -1, open_id: 0, region_id: 0,
  region_info: { code: 0, is_idf: false, is_restricted_region: false, restriction_text: '' },
  resource_url: 'https://dl.cdn.freefiremobile.com/live/ABHotUpdates/', review_version: '',
  scribe_report_url: '', server_id: 'brayan', version: '1.43.0'
});

function resp(res, status, buf, tipo) {
  const cab = {
    'Content-Type': tipo,
    'Content-Length': buf.length,
    'Connection': 'close'
  };
  res.writeHead(status, cab);
  res.end(buf);
}

function servLobby(req, res) {
  const rota = req.url.split('?')[0];
  const e = IDX[rota];
  if (!e) {
    console.log('[brayan] rota desconhecida (200 vazio): ' + rota);
    return resp(res, 200, Buffer.alloc(0), 'application/octet-stream');
  }
  let buf = Buffer.alloc(0);
  if (e.tem) { try { buf = corpo(e.arq); } catch (_) {} }
  console.log('[brayan] ' + req.method + ' ' + rota + ' -> ' + e.status + ' (' + buf.length + 'b)');
  resp(res, e.status, buf, 'application/octet-stream');
}

// :18000 cfg — ver.php
http.createServer((req, res) => {
  console.log('[brayan cfg] ' + req.method + ' ' + req.url);
  if (req.url.includes('ver.php')) return resp(res, 200, Buffer.from(VER), 'application/json');
  resp(res, 200, Buffer.from('{}'), 'application/json');
}).listen(18000);

// :18001 login — MajorLogin
http.createServer((req, res) => {
  console.log('[brayan login] ' + req.method + ' ' + req.url);
  if (req.url.split('?')[0] === '/MajorLogin') {
    req.on('data', () => {});
    return req.on('end', () => resp(res, 200, MAJORLOGIN, 'application/octet-stream'));
  }
  req.on('data', () => {});
  req.on('end', () => resp(res, 200, Buffer.alloc(0), 'application/octet-stream'));
}).listen(18001);

// :18002 lobby — replay do corpus
http.createServer(servLobby).listen(18002);

console.log('=== BRAYAN LOBBY 1.43 — independente ===');
console.log('  :18000 ver.php (JSON sintetico, is_server_open=true)');
console.log('  :18001 /MajorLogin (protobuf capturado, lobby -> 127.0.0.1:18002)');
console.log('  :18002 ' + Object.keys(IDX).length + ' rotas em replay (caps/)');
console.log('  conta: BR_CLN444444 uid 90643890 — mochila 29302 itens, 999999 ouro/diamante');
