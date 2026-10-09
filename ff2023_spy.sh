#!/data/data/com.termux/files/usr/bin/bash
# ESPIAO MID5 v1 — captura TUDO que o FF2023 (pautavero) fala com a internet
B='\033[1m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; R='\033[31m'; N='\033[0m'
echo -e "${C}${B}"
echo "  =============================="
echo "   ESPIAO MID5 v1 — Rzim FF2023"
echo "  =============================="
echo -e "${N}"

if ! command -v mitmdump >/dev/null 2>&1; then
  echo -e "${Y}[!] mitmproxy nao achado, instalando (um tempo so)...${N}"
  pkg install -y tur-repo >/dev/null 2>&1
  pkg install -y mitmproxy || pip install -y mitmproxy
fi
command -v mitmdump >/dev/null 2>&1 || { echo -e "${R}[X] Falhou. Roda: pkg install tur-repo -y && pkg install mitmproxy -y${N}"; exit 1; }

MODE="${1:-capturar}"
CA="$HOME/.mitmproxy/mitmproxy-ca-cert.cer"

gera_ca() {
  [ -f "$CA" ] && return
  mitmdump -q --set connection_strategy=lazy >/dev/null 2>&1 &
  P=$!; sleep 4; kill $P 2>/dev/null; sleep 1
}

case "$MODE" in
  cert|certificado)
    gera_ca
    echo -e "${G}[i] Vai abrir o instalador: OK / Instalar > 'Autoridade de certificado (CA)'${N}"
    termux-open "$CA" 2>/dev/null || echo -e "${R}[X] Arquivo: $CA${N}"
    ;;
  capturar)
    gera_ca
    echo -e "${B}[1] WiFi > engrenagem da tua rede > Proxy > MANUAL${N}"
    echo -e "    Host ${G}127.0.0.1${N}  Porta ${G}8080${N}"
    echo -e "${B}[2] Roda: ${G}bash ff2023_spy.sh cert${N} (instalar o certificado CA)${N}"
    echo -e "${B}[3] Abre o ${G}Spy_MID5${N}, loga e aperta em TUDO (loja, ranking, amigos, lobby)${N}"
    echo -e "${B}[4] Acabou? ${Y}Ctrl+C${N} aqui e tira o Proxy do WiFi${N}"
    echo ""
    echo -e "${C}[*] GRAVANDO ff2023.flows — o jogo vai falando ao vivo:${N}"
    mitmdump -w ff2023.flows --set flow_detail=1
    echo ""
    echo -e "${Y}[i] Nao esquece de tirar o Proxy do WiFi!${N}"
    echo -e "${G}[i] Manda o arquivo ff2023.flows pro Elio no WhatsApp.${N}"
    ;;
esac
