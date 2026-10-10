#!/data/data/com.termux/files/usr/bin/bash
# ESPIAO MID5 v4 — UM comando liga, Ctrl+C desliga (nada de WiFi)
B='\033[1m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; R='\033[31m'; N='\033[0m'
clear
echo -e "${C}${B}"
echo "  =============================="
echo "   ESPIAO MID5 v4 — Rzim FF2023"
echo "  =============================="
echo -e "${N}"

echo -e "${Y}[*] Checando as coisas (primeira vez demora mesmo)...${N}"
command -v mitmdump >/dev/null 2>&1 || {
  pkg install -y tur-repo >/dev/null 2>&1
  pkg update -y >/dev/null 2>&1
  pkg install -y mitmproxy >/dev/null 2>&1
  if ! command -v mitmdump >/dev/null 2>&1; then
    pkg install -y python python-cryptography >/dev/null 2>&1
    pip install mitmproxy >/dev/null 2>&1
  fi
}
command -v adb >/dev/null 2>&1 || pkg install -y android-tools >/dev/null 2>&1
command -v mitmdump >/dev/null 2>&1 || { echo -e "${R}[X] Roda na mao: pkg install python-cryptography -y && pip install mitmproxy${N}"; exit 1; }
command -v adb >/dev/null 2>&1 || { echo -e "${R}[X] Roda na mao: pkg install android-tools -y${N}"; exit 1; }

CA="$HOME/.mitmproxy/mitmproxy-ca-cert.cer"
[ -f "$CA" ] || { mitmdump -q --set connection_strategy=lazy >/dev/null 2>&1 & P=$!; sleep 4; kill $P 2>/dev/null; sleep 1; }
if [ -f "$CA" ] && [ ! -f "$HOME/.mitmproxy/instalado" ]; then
  echo -e "${Y}[*] Vai abrir o instalador: OK > 'Autoridade de certificado (CA)' > Instalar${N}"
  termux-open "$CA" >/dev/null 2>&1 && touch "$HOME/.mitmproxy/instalado"
  sleep 8
fi

CFG="$HOME/.ff2023_adb"
if [ ! -f "$CFG" ]; then
  echo -e "${B}=== SO UMA VEZ: parear o ADB ===${N}"
  echo -e "[1] Config > Sobre o telefone > toca 7x em 'versao MIUI'"
  echo -e "[2] Config > Config adicionais > Opcoes do desenvolvedor > liga ${G}Depuracao sem fio${N}"
  echo -e "[3] Toca em ${G}Parear dispositivo com codigo${N}"
  read -p "Porta de PAREAMENTO (ex: 41234): " PPORT
  read -p "Codigo de 6 digitos: " CODE
  adb pair localhost:$PPORT $CODE || { echo -e "${R}[X] Pareamento errado, roda de novo${N}"; exit 1; }
  read -p "Agora a porta da tela PRINCIPAL da Depuracao sem fio (ex: 37851): " CPORT
  echo "$CPORT" > "$CFG"
fi
CPORT=$(cat "$CFG")
adb connect localhost:$CPORT >/dev/null 2>&1
sleep 2
adb devices 2>/dev/null | grep -q "device$" || {
  echo -e "${R}[X] Nao conectou. Liga a 'Depuracao sem fio' nas Opcoes do desenvolvedor e roda de novo.${N}"
  rm -f "$CFG"; exit 1; }

adb shell settings put global http_proxy 127.0.0.1:8080
echo -e "${G}[*] Proxy do celular LIGADO sozinho${N}"
echo -e "${B}[*] Abre o ${G}Spy_MID5${N} e aperta em TUDO (login, loja, ranking, amigos, lobby)${N}"
echo -e "${B}[*] Acabou? ${Y}Ctrl+C${N} aqui que ele desliga tudo sozinho${N}"
echo ""
echo -e "${C}[*] Capturando ff2023.flows — o jogo falando ao vivo:${N}"
trap 'adb shell settings put global http_proxy :0 >/dev/null 2>&1; echo ""; echo -e "${G}[i] Proxy DESLIGADO sozinho. Gravou ff2023.flows! Manda pro Elio no WhatsApp.${N}"' EXIT
mitmdump -w ff2023.flows --set flow_detail=1
