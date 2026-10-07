// ============================================================
// FF2018 PROXY ESPIAO v5 - cache so de sucesso + captura login
//   node ff2018_proxy.js
// Tudo que o jogo pedir vai ser logado em lobby_log.txt
// - corpos de pedido E resposta salvos em base64 (protobuf intacto)
// - ver.php reescrito (nunca peda atualizacao)
// - cache anti-queda SO de respostas 200 (erros 4xx/5xx nao sao
//   cacheados nem reutilizados - resposta de erro nunca repete)
// - resposta 200 do /PlatformLogin salva em loginres.bin
// - ver.php sintetico se o original cair
// ============================================================
const http = require("http");
const fs = require("fs");
const { URL } = require("url");
const ALVO = { host: "190.115.198.51", port: 18000 };
const LOG = "lobby_log.txt";
const CACHE = "cache_respostas.json";

function log(linha) {
  const t = new Date().toISOString();
  console.log(t, JSON.stringify({ ts: t, ...linha }));
  fs.appendFileSync(LOG, JSON.stringify({ ts: t, ...linha }) + "\n");
}
let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(CACHE, "utf8"));
  // v5: limpa entradas de erro herdadas de versoes antigas
  let removidos = 0;
  for (const k of Object.keys(cache)) {
    if (!cache[k] || cache[k].status < 200 || cache[k].status >= 300) {
      delete cache[k]; removidos++;
    }
  }
  if (removidos > 0) {
    fs.writeFileSync(CACHE, JSON.stringify(cache));
    console.log("[v5] cache limpo:", removidos, "entradas de erro descartadas");
  }
} catch (e) {}
function salvaCache() { try { fs.writeFileSync(CACHE, JSON.stringify(cache)); } catch (e) {} }

function versaoDoCliente(url) {
  try { return new URL(url, "http://x").searchParams.get("version") || "1.25.3"; }
  catch (e) { return "1.25.3"; }
}
function verSintetico(url) {
  const v = versaoDoCliente(url);
  return JSON.stringify({
    code: 0, is_server_open: true, is_firewall_open: false,
    billboard_msg: "", remote_version: v, remote_option_version: "1.0.0",
    cdn_url: "http://127.0.0.1:18000/", server_url: "http://127.0.0.1:18000/",
    is_review_server: false, appstore_url: "https://discord.gg/privateproject",
    force_to_restart_app: false, country_code: "BR", gdpr_version: 2,
    client_ip: "127.0.0.1", maintenance_announcement: "", maintenance_region: "",
    query_params: { appstore: "googleplay", device: "android", lang: "pt-br",
                    region: "DEFAULT", version: v }
  });
}
function reescreveVer(url, corpo) {
  try {
    const j = JSON.parse(corpo.toString("utf8"));
    const v = versaoDoCliente(url);
    const antes = j.remote_version;
    j.remote_version = v;
    j.remote_option_version = j.remote_option_version || "1.0.0";
    j.is_server_open = true;
    j.force_to_restart_app = false;
    j.cdn_url = "http://127.0.0.1:18000/";
    j.server_url = "http://127.0.0.1:18000/";
    log({ tipo: "VER-REAESCRITO", antes, agora: v });
    return Buffer.from(JSON.stringify(j));
  } catch (e) { return corpo; }
}

const server = http.createServer((req, res) => {
  let corpo = [];
  req.on("data", (c) => corpo.push(c));
  req.on("end", () => {
    const body = Buffer.concat(corpo);
    const cab = { ...req.headers };
    delete cab.host;
    const ehVer = req.url.startsWith("/live/ver.php");
    const ehLogin = req.url.startsWith("/PlatformLogin");
    const p = http.request(
      { host: ALVO.host, port: ALVO.port, method: req.method,
        path: req.url, headers: cab, timeout: 25000 },
      (pr) => {
        let rb = [];
        pr.on("data", (c) => rb.push(c));
        pr.on("end", () => {
          let respBody = Buffer.concat(rb);
          if (ehVer) respBody = reescreveVer(req.url, respBody);
          // v5: so cacheia SUCESSO (2xx)
          if (!ehVer && pr.statusCode >= 200 && pr.statusCode < 300) {
            cache[req.url] = { status: pr.statusCode, body: respBody.toString("base64") };
            salvaCache();
          } else if (!ehVer) {
            log({ tipo: "NAO-CACHEADO", rota: req.url, status: pr.statusCode });
          }
          // v5: guarda ouro do login fora do log tb
          if (ehLogin && pr.statusCode >= 200 && pr.statusCode < 300) {
            const arq = "loginres_" + Date.now() + ".bin";
            try { fs.writeFileSync(arq, respBody); } catch (e) {}
            log({ tipo: "LOGIN-CAPTURADO", status: pr.statusCode, arquivo: arq, bytes: respBody.length });
          }
          log({ tipo: "resposta", metodo: req.method, rota: req.url,
                status: pr.statusCode,
                req_b64: body.slice(0, 32768).toString("base64"),
                resp_b64: respBody.slice(0, 131072).toString("base64"),
                resp_preview: respBody.slice(0, 300).toString("utf8") });
          res.writeHead(pr.statusCode, { "Content-Type": pr.headers["content-type"] || "application/json" });
          res.end(respBody);
        });
      });
    p.on("timeout", () => { p.destroy(new Error("timeout")); });
    p.on("error", (e) => {
      log({ tipo: "erro-proxy", rota: req.url, erro: String(e) });
      if (ehVer) {
        log({ tipo: "VER-SINTETICO", rota: req.url });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(verSintetico(req.url));
        return;
      }
      const c = cache[req.url];
      if (c && c.status >= 200 && c.status < 300) {
        log({ tipo: "CACHE-REUSADO", rota: req.url, status: c.status });
        res.writeHead(c.status, { "Content-Type": "application/json" });
        res.end(Buffer.from(c.body, "base64"));
      } else {
        log({ tipo: "SEM-CACHE-SERVIDOR-CAIDO", rota: req.url });
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end("{}");
      }
    });
    log({ tipo: "pedido", metodo: req.method, rota: req.url,
          req_b64: body.slice(0, 32768).toString("base64") });
    p.end(body);
  });
});

server.listen(18000, "0.0.0.0", () => {
  console.log("=== PROXY ESPIAO v5 no ar :18000 (cache so de 200) ===");
});
