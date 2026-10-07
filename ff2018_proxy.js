// ============================================================
// FF2018 PROXY ESPIAO v3 - reescreve o ver.php (fim do "atualizar")
//   node ff2018_proxy.js
// - remote_version sempre igual a do cliente = nunca pede update
// - cdn_url/server_url apontam pro proxy (captura mais rotas)
// - cache anti-queda + resposta sintetica se o original cair
// ============================================================
const http = require("http");
const fs = require("fs");
const { URL } = require("url");
const ALVO = { host: "190.115.198.51", port: 18000 };
const LOG = "lobby_log.txt";
const CACHE = "cache_respostas.json";

function log(linha) {
  const t = new Date().toISOString();
  console.log(t, linha);
  fs.appendFileSync(LOG, JSON.stringify({ ts: t, ...linha }) + "\n");
}
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch (e) {}
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

// aplica as reescritas do ver.php no corpo da resposta
function reescreveVer(url, corpo) {
  try {
    const j = JSON.parse(corpo.toString("utf8"));
    const v = versaoDoCliente(url);
    const antes = j.remote_version;
    j.remote_version = v;                        // nunca pede update
    j.remote_option_version = j.remote_option_version || "1.0.0";
    j.is_server_open = true;
    j.force_to_restart_app = false;
    j.cdn_url = "http://127.0.0.1:18000/";       // tudo passa pelo proxy
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
    const p = http.request(
      { host: ALVO.host, port: ALVO.port, method: req.method,
        path: req.url, headers: cab, timeout: 20000 },
      (pr) => {
        let rb = [];
        pr.on("data", (c) => rb.push(c));
        pr.on("end", () => {
          let respBody = Buffer.concat(rb);
          if (ehVer) respBody = reescreveVer(req.url, respBody);
          if (!ehVer) cache[req.url] = { status: pr.statusCode, body: respBody.toString("base64") };
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
      if (ehVer) {
        log({ tipo: "VER-SINTETICO", rota: req.url });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(verSintetico(req.url));
        return;
      }
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
  console.log("=== PROXY ESPIAO v3 (ver.php reescrito) no ar :18000 ===");
  console.log("NUNCA mais vai pedir atualizacao. Ctrl+C pra parar.");
});
