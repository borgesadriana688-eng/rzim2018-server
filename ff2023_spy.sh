#!/data/data/com.termux/files/usr/bin/bash
# ESPIAO MID5 v8 — o espio ja ta DENTRO do APK. Aqui e so a tela dele.
B='\033[1m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; R='\033[31m'; N='\033[0m'
clear
echo -e "${C}${B}"
echo "  =============================="
echo "   ESPIAO MID5 v8 — Rzim FF2023"
echo "  =============================="
echo -e "${N}"

command -v python3 >/dev/null 2>&1 || pkg install -y python >/dev/null 2>&1
command -v python3 >/dev/null 2>&1 || { echo -e "${R}[X] Roda: pkg install python -y${N}"; exit 1; }

cat > $HOME/ff2023_listener.py <<'PY'
import socket, threading, time, os, sys
LOG = os.path.expanduser("~/ff2023_captura.txt")
print("esperando o jogo...", flush=True)
def serve():
    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", 8081))
    srv.listen(8)
    while True:
        c, _ = srv.accept()
        def go(c=c):
            try:
                f = c.makefile("rb")
                for raw in f:
                    s = raw.decode("utf-8", "replace").strip()
                    if s:
                        ts = time.strftime("%H:%M:%S")
                        print("[" + ts + "] " + s, flush=True)
                        with open(LOG, "a") as lf:
                            lf.write(time.strftime("%H:%M:%S ") + s + "\n")
            except Exception:
                pass
            finally:
                try: c.close()
                except Exception: pass
        threading.Thread(target=go, daemon=True).start()
serve()
PY

rm -f $HOME/ff2023_captura.txt
echo -e "${G}[*] Espiao LIGADO na porta 8081${N}"
echo -e "${B}[*] Abre o ${G}Spy_MID5${N}${B} e aperta em TUDO (login, loja, ranking, amigos)${N}"
echo -e "${B}[*] Quando o jogo abrir vai aparecer: ${G}ESPIAO NO AR v8${N}"
echo -e "${B}[*] Acabou? ${Y}Ctrl+C\${N}\${B} aqui${N}"
echo ""
python3 $HOME/ff2023_listener.py
echo ""
echo -e "${G}[i] Gravou ff2023_captura.txt! Manda pro Elio no WhatsApp.${N}"
