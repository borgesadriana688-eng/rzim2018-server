// RESUMO DO PROTOCOLO CAPTURADO - roda no Termux: node resumo.js
// Mostra rotas HTTP + resumo das conexoes TCP (tamanhos e primeiros bytes em hex)
const fs = require('fs');
const LOG = 'lobby_log.txt';

let linhas = [];
try { linhas = fs.readFileSync(LOG, 'utf8').trim().split('\n'); } catch (e) {
  console.log('nao achei ' + LOG + ' na pasta atual'); process.exit(1);
}
const e = [];
for (const x of linhas) { try { e.push(JSON.parse(x)); } catch (_) {} }

console.log('=== ROTAS HTTP ===');
const rotas = {};
for (const o of e) {
  if (o.rota && !o.tipo) {
    const r = o.rota.replace(/%00+/g, '').split('?')[0];
    const k = (o.porta || '?') + ' ' + (o.metodo || 'GET') + ' ' + r;
    rotas[k] = (rotas[k] || 0) + 1;
  }
}
for (const k of Object.keys(rotas)) console.log('x' + String(rotas[k]).padStart(3), k);

console.log('');
console.log('=== CONEXOES TCP (porta 3002 deles) ===');
let n = 0;
for (const o of e) {
  if (o.tipo === 'tcp-enviado') {
    n++;
    console.log('');
    console.log('--- CONEXAO ' + n + ' ---');
    const d = Buffer.from(o.dados, 'base64');
    console.log('-> ' + o.bytes + 'b | hex: ' + d.slice(0, 100).toString('hex'));
  } else if (o.tipo === 'tcp-recebido') {
    const d = Buffer.from(o.dados, 'base64');
    const txt = d.slice(0, 60).toString('utf8').replace(/[^\x20-\x7e]/g, '.');
    console.log('<- ' + o.bytes + 'b | hex: ' + d.slice(0, 100).toString('hex'));
    if (/^[\x20-\x7e]{10,}/.test(txt)) console.log('   ascii: ' + txt);
  }
}
console.log('');
console.log('=== MAIOR RESPOSTA (cortada no log em 4KB) ===');
for (const o of e) if (o.tipo === 'tcp-recebido' && o.bytes > 50000)
  console.log('uma resposta de ' + o.bytes + 'b (banco de itens/skins?)');
