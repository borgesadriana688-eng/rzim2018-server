#!/usr/bin/env python3
# ff143_bridge.py - ponte local -> Render (HTTPS 443)
# Escuta 18000/18001/18002/5008 (HTTP puro, como o IPS) e repassa TUDO
# pra https://rzim-lobby143.onrender.com por TLS.
# So stdlib: python ff143_bridge.py
import os, time, threading, http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TARGET_HOST = os.environ.get("TARGET_HOST", "rzim-lobby143.onrender.com")
PORTS = [18000, 18001, 18002, 5008]
KEEP_AWAKE = os.environ.get("KEEP_AWAKE", "1") == "1"

class Bridge(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, fmt, *a):
        print("[bridge] %s" % (fmt % a), flush=True)
    def _relay(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else None
        c = http.client.HTTPSConnection(TARGET_HOST, timeout=60)
        headers = {k: v for k, v in self.headers.items()
                   if k.lower() not in ("host", "connection", "content-length", "accept-encoding")}
        if body is not None:
            headers["Content-Length"] = str(len(body))
        c.request(self.command, self.path, body=body, headers=headers)
        r = c.getresponse()
        data = r.read()
        c.close()
        self.send_response(r.status)
        for k, v in r.getheaders():
            if k.lower() in ("transfer-encoding", "content-length", "connection", "content-encoding"):
                continue
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    do_GET = do_POST = do_PUT = do_DELETE = do_PATCH = do_HEAD = _relay

def keep_alive():
    while True:
        time.sleep(14 * 60)
        try:
            c = http.client.HTTPSConnection(TARGET_HOST, timeout=45)
            c.request("GET", "/health"); c.getresponse().read(); c.close()
        except Exception:
            pass

def main():
    if KEEP_AWAKE:
        threading.Thread(target=keep_alive, daemon=True).start()
    for p in PORTS:
        srv = ThreadingHTTPServer(("0.0.0.0", p), Bridge)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        print("[bridge] :%d -> https://%s" % (p, TARGET_HOST), flush=True)
    print("[bridge] PRONTO. abre o jogo.", flush=True)
    threading.Event().wait()

if __name__ == "__main__":
    main()
