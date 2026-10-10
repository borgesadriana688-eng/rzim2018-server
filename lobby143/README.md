# Rzim Lobby 1.43 (replay das capturas reais)

Servidor standalone em Python puro (zero dependencia). Sobe nas portas:
3000 (ver.php), 3001 (MajorLogin), 3002 (lobby TCP), 5008 (app/info/get),
18000-18002 (alias do cliente IPS local).

Deploy Railway: startCommand `python ff143_lobby.py`.
TCP domains necessarios (fonte -> servico): 3000, 3001, 3002, 5008.
