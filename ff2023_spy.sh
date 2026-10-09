#!/data/data/com.termux/files/usr/bin/bash
# ESPIAO MID5 v2 — um comando liga, Ctrl+C desliga
B='\033[1m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; R='\033[31m'; N='\033[0m'
clear
echo -e "${C}${B}"
echo "  =============================="
echo "   ESPIAO MID5 v2 — Rzim FF2023"
echo "  =============================="
echo -e "${N}"

if ! command -v mitmdump >/dev/null 2>&1; then
  echo -e "${Y}[*] Instalando mitmproxy (so da primeira vez, relaxa)...${N}"
  pkg install -y tur-repo >/dev/null 2>&1
  pkg install -y mitmproxy >/dev/null 2>&1
  command -v mitmdump >/dev/null 2>&1 || { echo -e "${R}[X] Nao deu, roda na mao: pkg install tur-repo -y && pkg install mitmproxy -y${N}"; exit 1; }
fi

CA="$HOME/.mitmproxy/mitmproxy-ca-cert.cer"
if [ ! -f "$CA" ]; then
  echo -e "${Y}[*] Gerando certificado...${N}"
  mitmdump -q --set connection_strategy=lazy >/dev/null 2>&1 &
  P=$!; sleep 4; kill $P 2>/dev/null; sleep 1
fi
if [ -f "$CA" ] && [ ! -f "$HOME/.mitmproxy/instalado" ]; then
  echo -e "${Y}[*] PRIMEIRA VEZ: vai abrir o instalador do certificado.${N}"
  echo -e "${Y}    Toca OK, escolhe 'Autoridade de certificado (CA)' e instala.${N}"
  termux-open "$CA" >/dev/null 2>&1 && touch "$HOME/.mitmproxy/instalado"
  sleep 8
fi

echo -e "${B}[1] Liga o proxy UMA vez (fica salvo): WiFi > engrenagem > Proxy > MANUAL > ${G}127.0.0.1:8080${N}"
echo -e "${B}[2] Abre o ${G}Spy_MID5${N} e aperta em TUDO (loja, ranking, amigos, lobby)${N}"
echo -e "${B}[3] Acabou? ${Y}Ctrl+C${N} aqui${N}"
echo ""
echo -e "${C}[*] Capturando ff2023.flows — o jogo falando ao vivo:${N}"
trap 'echo ""; echo -e "${G}[i] Gravou ff2023.flows! Manda pro Elio no WhatsApp.${N}"; echo -e "${Y}[i] Internet do celular: WiFi > Proxy > Nenhum${N}"' EXIT
mitmdump -w ff2023.flows --set flow_detail=1
