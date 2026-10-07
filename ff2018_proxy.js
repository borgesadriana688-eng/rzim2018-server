// ============================================================
// FF2018 PROXY ESPIAO - jogo funciona igual, protocolo capturado
// Roda no Termux (celular que tem o jogo instalado):
//   pkg install nodejs -y
//   node ff2018_proxy.js
// Deixa rodando, joga, e depois manda o lobby_log.txt pro agente
// ============================================================
const http = require("http");
const fs = require("fs");
const ALVO = { host: "190.115.198.51", port: 18000 }; // servidor original (funciona igual)
const LOG = "lobby_log.txt";

function log(linha) {
  const t = new Date().toISOString();
  console.log(t, linha);
  fs.appendFileSync(LOG, JSON.stringify({ ts: t, ...linha }) + "\n");
}

const server = http.createServer((req, res) => {
  let corpo = [];
  req.on("data", (c) => corpo.push(c));
  req.on("end", () => {
    const body = Buffer.concat(corpo);
    const cab = { ...req.headers };
    delete cab.host;
    const opcoes = {
      host: ALVO.host, port: ALVO.port, method: req.method,
      path: req.url, headers: cab,
    };
    const p = http.request(opcoes, (pr) => {
      let rb = [];
      pr.on("data", (c) => rb.push(c));
      pr.on("end", () => {
        const respBody = Buffer.concat(rb);
        let resumo;
        try { resumo = respBody.slice(0, 4000).toString("utf8"); }
        catch (e) { resumo = "(binario " + respBody.length + " bytes)"; }
        log({ tipo: "resposta", metodo: req.method, rota: req.url,
              status: pr.statusCode,
              req_body: body ? body.slice(0, 4000).toString("utf8") : "",
              resp: resumo });
        res.writeHead(pr.statusCode, pr.headers);
        res.end(respBody);
      });
    });
    p.on("error", (e) => {
      log({ tipo: "erro-proxy", rota: req.url, erro: String(e) });
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end("{}");
    });
    log({ tipo: "pedido", metodo: req.method, rota: req.url,
          body: body ? body.slice(0, 2000).toString("utf8") : "" });
    p.end(body);
  });
});

server.listen(18000, "0.0.0.0", () => {
  console.log("=== PROXY ESPIAO no ar :18000 ===");
  console.log("Tudo que o jogo pedir vai ser logado em " + LOG);
  console.log("Ctrl+C pra parar. Nao feche o Termux enquanto joga.");
});
