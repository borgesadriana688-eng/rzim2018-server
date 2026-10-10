#!/data/data/com.termux/files/usr/bin/bash
# RZIM LOBBY 1.43 — servidor de replay das capturas reais
B='\033[1m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; R='\033[31m'; N='\033[0m'
clear
command -v python3 >/dev/null 2>&1 || pkg install -y python >/dev/null 2>&1
curl -sL -o $HOME/ff143_lobby.py https://raw.githubusercontent.com/borgesadriana688-eng/rzim2018-server/main/ff143_lobby.py
ls -la $HOME/ff143_lobby.py | grep -q ff143 || { echo -e "${R}[X] Baixou errado. Roda de novo.${N}"; exit 1; }
echo -e "${C}${B}  RZIM LOBBY 1.43${N}"
echo ""
python3 $HOME/ff143_lobby.py
