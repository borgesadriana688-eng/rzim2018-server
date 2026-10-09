# Protocolo FF 1.43 (Pautavero) — porta 3002 (capturado 8/out/2026)

## Arquitetura completa (3 portas HTTP, tudo protobuf)
- :3000 cfg    — GET /live/ver.php (JSON), cdn oficial Garena
- :3001 login  — POST /MajorLogin (protobuf 1146b) -> sessao + token
- :3002 lobby  — HTTP/1.1 + protobuf, header `Authorization: Bearer <token do MajorLogin>`

## 24 rotas da :3002 (91 conexoes capturadas)
GET 200: /GetFreshActivityInfo, /GetLinkageActivityInfo
POST 200: /GetLoginData, /GetStore, /GetBackpack, /ChangeClothes, /PurchaseGacha,
  /UnlockProfile, /GetGachaSpecialExchangeDesc, /GetPlatformProfile, /GetPlayerPersonalShow,
  /LoginGetDesc, /LoginGetSplash
POST ?: /OpenTreasureBox, /EPClaimReward, /EPVideoAdPortal, /GetAccountLifeSeasonStats,
  /GetFollowStreamerList, /GetFriend, /GetMailList, /GetPlatformFriendIDs,
  /GetPlatformFriends, /GetSubscribeStore, /GetTopupEventInfo

## Formato
- Pedido: `POST /Rota HTTP/1.1`, Content-Type: application/x-www-form-urlencoded
  (corpo e protobuf na pratica), Accept-Encoding: gzip, Connection: Keep-Alive
- Resposta: `HTTP/1.1 200 OK`, Content-Type: application/octet-stream, protobuf cru (sem gzip)

## Padrao STATE-RETURN
Rotas que mutam/consultam conta (GetBackpack, PurchaseGacha, ChangeClothes) devolvem
SEMPRE o snapshot completo da conta (958.424b protobuf: itens, skins, moedas, 999999 ouro/diamante).
GetStore = 137.826b (loja). GetLoginData = 348b.

## Campos uteis do /GetLoginData (protobuf)
- campo 4: nome da conta "BR_CLN444444"
- campo 5: uid 90643890 (varint)
- campo 14: "179.198.108.48:12100" -> PORTA DE PARTIDA (match server) — quarta porta!
- token Bearer das chamadas: mesmo hash da resposta do MajorLogin

## Proximo passo
v8: proxy com captura COMPLETA (sem cap de 4KB) -> gravar snapshot 958KB de cada rota
-> gerar templates pro rzim2018-server responder sozinho (mesmo uid/token).
Depois: porta 12100 (partida).
