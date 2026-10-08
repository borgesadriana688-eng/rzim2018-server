// RESUMO DO LOBBY_LOG - roda no Termux: node resumo.js
// Gera resumo.txt (1 linha por chamada, compacto pra mandar no zap)
// e extrato_*.b64 (corpos binarios completos por rota, pra decodificar depois)
const fs = require('fs');
const ARQ = process.argv[2] || 'lobby_log.txt';
const saida = [];
const binarios = {};

if (!fs.existsSync(ARQ)) { console.log('nao achei ' + ARQ); process.exit(1); }

const linhas = fs.readFileSync(ARQ, 'utf8').split('\n');
let quebradas = 0;
for (const l of linhas) {
  if (!l.trim()) continue;
  let o;
  try { o = JSON.parse(l); } catch (e) { quebradas++; continue; }
  const rota = (o.rota || '?').split('?')[0];
  const q = (o.rota || '').includes('?') ? '?' + (o.rota.split('?')[1] || '').slice(0, 60) : '';
  const st = o.status !== undefined ? o.status : ('ERRO:' + (o.erro || '?'));
  const resp = o.resposta || '';
  const ped = o.pedido || '';
  let snip = '';
  // corpo de resposta: se for texto, mostra comeco; se base64 binario, marca
  function eBinario(s) {
    if (!s || s.length < 8) return false;
    if (/^[\{\[]/.test(s)) return false; // json
    if (/^[\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]*$/.test(s)) {
      // eh texto: binario so se parecer base64 de dados nao-printaveis
      try {
        const buf = Buffer.from(s.slice(0, 200), 'base64');
        const prin = buf.filter(b => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127)).length;
        return buf.length > 10 && prin / buf.length < 0.8;
      } catch (e) { return false; }
    }
    return true;
  }
  if (resp.length > 0) {
    if (eBinario(resp)) {
      snip = '<binario ' + Math.round(resp.length * 3 / 4) + 'b>';
      const chave = rota.replace(/\//g, '_').replace(/^_+/, '').slice(0, 40);
      binarios[chave] = (binarios[chave] || '') + resp + '\n';
    } else snip = resp.slice(0, 120).replace(/\n/g, ' ');
  }
  let snipPed = '';
  if (ped.length > 0) {
    if (/^[\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]*$/.test(ped)) snipPed = ' | ped: ' + ped.slice(0, 80).replace(/\n/g, ' ');
    else snipPed = ' | ped: <binario ' + Math.round(ped.length * 3 / 4) + 'b>';
  }
  saida.push(`[${(o.t || '').slice(11, 19)}] ${o.metodo || '?'} ${rota}${q} -> ${st} (resp ${Math.round(resp.length * 3 / 4)}b)${snipPed} = ${snip}`);
}

fs.writeFileSync('resumo.txt', saida.join('\n') + `\n\n== ${saida.length} chamadas, ${quebradas} linhas cortadas ==\n`);
for (const [k, v] of Object.entries(binarios)) fs.writeFileSync('extrato_' + k + '.b64', v);
console.log('resumo.txt: ' + saida.length + ' chamadas, ' + quebradas + ' linhas cortadas');
console.log('binarios salvos: ' + Object.keys(binarios).join(', '));
console.log('manda assim (compacta tudo):');
console.log('  cat resumo.txt | head -c 15000');
console.log('ou sobe o log inteiro comprimido no gofile:');
console.log('  gzip -9 -f lobby_log.txt && curl -s -F "file=@lobby_log.txt.gz" https://upload.gofile.io/contents/uploadfile');
