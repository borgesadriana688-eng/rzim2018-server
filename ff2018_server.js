// ============================================================
// FF2018 LOGIN SERVER - arquivo unico, sem dependencias
// Uso: node ff2018_server.js   (porta 18000, ou PORT=xxxx)
// Espelha o servidor 190.115.198.51:18000 (respostas reais) e
// reaproveita o contrato Garena SDK do nosso servidor 2.19.2.
// ============================================================
'use strict';
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT || '18000', 10);
const VERSION = process.env.GAME_VERSION || '1.25.3';
const SECRET_KEY = process.env.SECRET_KEY || 'ff2018_private_server_hmac_key';

function nowSecs() { return Math.floor(Date.now() / 1000); }
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}
function sign(b64) { return crypto.createHmac('sha256', SECRET_KEY).update(b64).digest('hex'); }

function mkToken(openId, nickname, type, rt) {
  const p = { open_id: openId, nickname: nickname, type: type, created: nowSecs(), expire: nowSecs() + 86400 * 30 };
  if (rt) { p.rt = true; p.expire = nowSecs() + 86400 * 60; }
  const b = b64url(Buffer.from(JSON.stringify(p)));
  return b + '.' + sign(b);
}
function verify(token) {
  if (!token || String(token).indexOf('.') < 0) return null;
  const [b, sig] = String(token).split('.');
  const exp = sign(b);
  const A = Buffer.from(sig || ''), B = Buffer.from(exp);
  if (A.length !== B.length || !crypto.timingSafeEqual(A, B)) return null;
  try {
    const p = JSON.parse(Buffer.from(b.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return p.expire < nowSecs() ? null : p;
  } catch (e) { return null; }
}
const ALPH = '0123456789abcdefghijklmnopqrstuvwxyz';
function seededOpenId(seed) {
  const d = crypto.createHash('sha256').update(String(seed)).digest();
  let s = '';
  for (let i = 0; i < 32; i++) s += ALPH[d[i] % 36];
  return s;
}
function uidFromOpenId(openId) {
  const h = crypto.createHash('sha256').update(String(openId)).digest();
  return 10000001 + (h[0] | h[1] << 8 | h[2] << 16) % 8999999;
}
function guestAccount(nickname, seed) {
  const openId = seed ? seededOpenId(seed) : seededOpenId('rand-' + crypto.randomBytes(8).toString('hex'));
  const nick = nickname || ('Guest' + (1000 + (crypto.createHash('sha256').update(openId).digest()[0] * 39) % 8999));
  return {
    open_id: openId,
    platform: 4,
    nickname: nick,
    access_token: mkToken(openId, nick, 'guest'),
    refresh_token: mkToken(openId, nick, 'guest', true),
    expires_in: 86400 * 30
  };
}

// ---- request helpers ----
function parseBody(buf, ctype) {
  if (!buf || !buf.length) return {};
  if (/json/.test(ctype || '')) { try { return JSON.parse(buf.toString('utf8')); } catch (e) { return {}; } }
  if (/x-www-form-urlencoded/.test(ctype || '')) {
    const o = {};
    for (const [k, v] of new URLSearchParams(buf.toString('utf8'))) o[k] = v;
    return o;
  }
  return {};
}
function getParam(body, query, name) {
  if (body[name] !== undefined && body[name] !== null && String(body[name]) !== '') return body[name];
  if (query[name] !== undefined && query[name] !== null) return query[name];
  return '';
}
function hostOf(req) { return (req.headers && req.headers.host) || ('127.0.0.1:' + PORT); }

function userInfo(d) {
  return {
    open_id: d.open_id, platform: 4, icon: '',
    nickname: d.nickname || 'Player', gender: 1, level: 1, exp: 0, avatar: '',
    is_guest: true, created_time: d.created || nowSecs(), vip_level: 0,
    diamond: 0, gold: 0, coins: 0, rank: 'Bronze', region: 'BR',
    skin_ids: [], character_ids: [], weapon_skin_ids: [], pet_ids: [], badges: [], achievements: []
  };
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = parseBody(Buffer.concat(chunks), req.headers['content-type']);
    const q = Object.fromEntries(u.searchParams.entries());
    const path = u.pathname;
    const send = (obj, code) => {
      const s = JSON.stringify(obj);
      res.writeHead(code || 200, { 'Content-Type': 'application/json' });
      res.end(s);
    };
    const tok = () => verify(getParam(body, q, 'access_token'));

    console.log(new Date().toISOString(), req.method, path, JSON.stringify(body).slice(0, 300));

    // --- bootstrap ---
    if (path === '/health') return send({ status: 'ok', server: 'ff2018-login', version: VERSION });
    if (path === '/ver.php') {
      return send({
        appstore_url: 'https://play.google.com/store/apps/details?id=com.dts.freefireth',
        billboard_msg: '', cdn_url: 'https://dl.cdn.freefiremobile.com/live/ABHotUpdates/',
        client_ip: req.socket.remoteAddress, code: 0, country_code: 'BR',
        force_to_restart_app: false, gdpr_version: 2, is_firewall_open: false,
        is_review_server: false, is_server_open: true, maintenance_announcement: '',
        maintenance_region: '', remote_option_version: '', remote_version: VERSION,
        server_url: 'http://' + hostOf(req) + '/'
      });
    }
    if (path === '/app/info/get') return send({ status: 0, client_log: false });

    // --- guest flow ---
    if (path === '/oauth/guest/register' || path === '/guest/register')
      return send(guestAccount(getParam(body, q, 'nickname') || null, getParam(body, q, 'uid') || getParam(body, q, 'device_id') || null));
    if (path === '/oauth/guest/token/grant' || path === '/guest/token/grant')
      return send(guestAccount(null, getParam(body, q, 'uid') || getParam(body, q, 'client_id') || null));
    if (path === '/oauth/token') {
      const gt = String(getParam(body, q, 'grant_type'));
      if (gt === 'refresh_token') {
        const d = verify(getParam(body, q, 'refresh_token'));
        if (d && d.rt) return send({ access_token: mkToken(d.open_id, d.nickname, d.type || 'guest'), refresh_token: mkToken(d.open_id, d.nickname, d.type || 'guest', true), expires_in: 86400 * 30, token_type: 'Bearer' });
        return send({ code: 2017, error: 'invalid_grant' });
      }
      return send(guestAccount(null, getParam(body, q, 'uid') || null));
    }
    if (path === '/oauth/token/inspect') {
      const d = verify(getParam(body, q, 'token') || getParam(body, q, 'access_token'));
      if (!d) return send({ code: 2017, error: 'invalid_grant' });
      return send({ expiry_time: d.expire, uid: uidFromOpenId(d.open_id), open_id: d.open_id, main_active_platform: 4, app_id: 100067, platform: 4, create_time: d.created || nowSecs(), scope: ['get_user_info', 'get_friends', 'payment', 'send_request'], login_type: 2, login_platform: 4 });
    }
    if (path === '/oauth/logout') return send({ success: 'true' });
    if (path === '/oauth/user/info/get' || path === '/user/info/get') {
      const d = tok();
      if (!d) return send({ code: 1004, error: 'invalid_token' });
      return send(userInfo(d));
    }
    if (/^\/(oauth\/)?user\/friends\//.test(path)) return send({ friends: [], total: 0, pending: [] });
    if (path === '/me' || /^\/v[\d.]+\/me$/.test(path)) {
      const d = tok();
      if (!d) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: { code: 190, message: 'Invalid OAuth access token' } })); }
      return send({ id: String(uidFromOpenId(d.open_id)), name: d.nickname || 'Player', first_name: d.nickname || 'Player', last_name: '' });
    }
    if (path === '/api/heartbeat') {
      const d = tok();
      if (!d) return send({ code: 1004, error: 'invalid_token' });
      return send({ status: 'ok', server_time: nowSecs(), game_server: hostOf(req) });
    }
    if (path === '/api/msdk') return send({ status: 0, server_time: nowSecs(), game_server: { ip: hostOf(req), port: 443 }, config: { version: VERSION, maintenance: false, notice: '' } });
    if (path === '/app/feedback') return send({ success: true });
    if (path === '/app/point/get_balance') return send({ code: 0, point: 0 });
    if (path === '/game/user/request/send' || path === '/rebates/redeem') return send({ success: true });

    // --- /live/ver.php (o jogo chama essa primeiro) ---
    if (path === '/live/ver.php' || path === '/live/ver') {
      const v = query.version || '1.25.3';
      console.log('[ver.php] cliente:', v);
      return send({
        code: 0, is_server_open: true, is_firewall_open: false, billboard_msg: "",
        remote_version: v, remote_option_version: "1.0.0",
        cdn_url: "http://" + hostOf(req) + "/", server_url: "http://" + hostOf(req) + "/",
        is_review_server: false, appstore_url: "", force_to_restart_app: false,
        country_code: "BR", gdpr_version: 2, client_ip: req.socket.remoteAddress,
        maintenance_announcement: "", maintenance_region: "",
        query_params: query
      });
    }
    // --- /live/ (lobby 2018) - stub logado ---
    if (path === '/live' || path.startsWith('/live/')) {
      console.log('[live]', req.method, path, JSON.stringify(body).slice(0, 200));
      return send({});
    }

    console.log('[404]', req.method, path);
    send({ error: 'invalid_request' }, 404);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log('FF2018 login server na porta ' + PORT + ' (versao ' + VERSION + ')'));
