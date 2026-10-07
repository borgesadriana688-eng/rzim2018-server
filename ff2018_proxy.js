// ============================================================
// FF2018 PROXY ESPIAO v2 - com CACHE ANTI-QUEDA
// Roda no Termux (celular que tem o jogo instalado):
//   node ff2018_proxy.js
// Tudo que o jogo pedir vai ser logado em lobby_log.txt
// Se o servidor original cair, o proxy reusa a ultima resposta boa
// ============================================================
const http = require("http");
const fs = require("fs");
const ALVO = { host: "190.115.198.51", port: 18000 };
const LOG = "lobby_log.txt";
const CACHE = "cache_respostas.json"; // respostas que funcionaram

function log(linha) {
  const t = new Date().toISOString();
  console.log(t, linha);
  fs.appendFileSync(LOG, JSON.stringify({ ts: t, ...linha }) + "\n");
}

let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch (e) {}

function salvaCache() {
  try { fs.writeFileSync(CACHE, JSON.stringify(cache)); } catch (e) {}
}

const server = http.createServer((req, res) => {
  let corpo = [];
  req.on("data", (c) => corpo.push(c));
  req.on("end", () => {
    const body = Buffer.concat(corpo);
    const cab = { ...req.headers };
    delete cab.host;
    const p = http.request(
      { host: ALVO.host, port: ALVO.port, method: req.method,
        path: req.url, headers: cab, timeout: 20000 },
      (pr) => {
        let rb = [];
        pr.on("data", (c) => rb.push(c));
        pr.on("end", () => {
          const respBody = Buffer.concat(rb);
          cache[req.url] = { status: pr.statusCode, body: respBody.toString("base64") };
          salvaCache();
          let resumo;
          try { resumo = respBody.slice(0, 4000).toString("utf8"); }
          catch (e) { resumo = "(binario " + respBody.length + " bytes)"; }
          log({ tipo: "resposta", metodo: req.method, rota: req.url,
                status: pr.statusCode,
                req_body: body ? body.slice(0, 4000).toString("utf8") : "",
                resp: resumo });
          res.writeHead(pr.statusCode, { "Content-Type": pr.headers["content-type"] || "application/json" });
          res.end(respBody);
        });
      });
    p.on("timeout", () => { p.destroy(new Error("timeout")); });
    p.on("error", (e) => {
      log({ tipo: "erro-proxy", rota: req.url, erro: String(e) });
      const c = cache[req.url];
      if (c) {
        log({ tipo: "CACHE-REUSADO", rota: req.url, status: c.status });
        res.writeHead(c.status, { "Content-Type": "application/json" });
        res.end(Buffer.from(c.body, "base64"));
      } else {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end("{}");
      }
    });
    log({ tipo: "pedido", metodo: req.method, rota: req.url,
          body: body ? body.slice(0, 2000).toString("utf8") : "" });
    p.end(body);
  });
});

server.listen(18000, "0.0.0.0", () => {
  console.log("=== PROXY ESPIAO v2 (com cache) no ar :18000 ===");
  console.log("Respostas boas ficam salvas em " + CACHE);
  console.log("Ctrl+C pra parar. Nao feche o Termux enquanto joga.");
});
