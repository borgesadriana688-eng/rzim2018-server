// ============================================================
// BRAYAN LOBBY 1.43 — versao Vercel (serverless)
// Todas as rotas caem aqui via vercel.json rewrites.
// Dominio exigido: brayan1.vercel.app (projeto Vercel "brayan1")
// Protocolo 1.43 Pautavero: ver.php JSON + MajorLogin protobuf + 48 rotas replay.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const BASE = 'https://brayan1.vercel.app';

// --- ver.php (JSON real capturado, server_url -> BASE) ---
const VER = "{\"appstore_url\":\"https://play.google.com/store/apps/details?id=com.dts.freefireth\",\"billboard_msg\":\"\",\"cdn_url\":\"https://dl.cdn.freefiremobile.com/live/ABHotUpdates/\",\"client_ip\":\"0.0.0.0\",\"code\":0,\"country_code\":\"BR\",\"force_to_restart_app\":false,\"gdpr_version\":2,\"is_firewall_open\":false,\"is_review_server\":false,\"is_server_open\":true,\"maintenance_announcement\":\"\",\"maintenance_region\":\"\",\"remote_option_version\":\"optionallocres:26|optionalclothres:282|optionalfullscreencgres:19|optionalludores:19|optionalmap1res:194|optionalmap2res:36|optionalmap4res:19|optionalmapres:17|optionalpetres:17|optionalrushb:38|optionalrushingpetsres:61|optionalvoiceres:147|optionalwerewolves:48\",\"remote_version\":\"1.43.0\",\"server_url\":\"https://brayan1.vercel.app/\"}";

// --- MajorLogin (hex TRUE 115b capturado; campo 10 = BASE, 26 bytes exatos) ---
const MAJORLOGIN = Buffer.from(
  '08bfade204120242521a024252220242522a046c697665320242523a02425242306135633739396637383561383037363136346535613330653834393936646565613663373339393038366239643964354880e101521a68747470733a2f2f62726179616e312e76657263656c2e6170706000', 'hex');

// --- corpus: 48 rotas em replay ---
const IDX = JSON.parse(fs.readFileSync(
  path.join(process.cwd(), 'brayan_lobby', 'caps_index.json'), 'utf8'));

function corpo(arq) {
  const rec = fs.readFileSync(path.join(process.cwd(), 'brayan_lobby', 'caps', arq));
  const corte = rec.toString('latin1').indexOf('\r\n\r\n');
  return rec.slice(corte + 4);
}

function enviar(res, status, buf, tipo) {
  res.setHeader('Content-Type', tipo);
  res.setHeader('Content-Length', buf.length);
  res.status(status).end(buf);
}

module.exports = (req, res) => {
  const rota = (req.url || '').split('?')[0];
  const suf = rota.split('/').filter(Boolean).pop() || '';

  // ver.php (cliente pede /live/ver.php ou //live/ver.php)
  if (suf === 'ver.php') {
    console.log('[brayan] ver.php');
    return enviar(res, 200, Buffer.from(VER), 'application/json');
  }

  // MajorLogin
  if (rota.endsWith('/MajorLogin')) {
    console.log('[brayan] MajorLogin');
    return enviar(res, 200, MAJORLOGIN, 'application/octet-stream');
  }

  // replay do corpus
  const e = IDX[rota] || IDX['/' + suf];
  if (e) {
    let buf = Buffer.alloc(0);
    if (e.tem) { try { buf = corpo(e.arq); } catch (_) {} }
    console.log('[brayan] ' + req.method + ' ' + rota + ' -> ' + e.status + ' (' + buf.length + 'b)');
    return enviar(res, e.status, buf, 'application/octet-stream');
  }

  // desconhecida: 200 vazio (igual ao comportamento tolerado pelo cliente)
  console.log('[brayan] desconhecida (200 vazio): ' + rota);
  enviar(res, 200, Buffer.alloc(0), 'application/octet-stream');
};
