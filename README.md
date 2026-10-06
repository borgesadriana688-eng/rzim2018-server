# RZIM FF2018 Login Server

Servidor de login/lobby do Free Fire 2018 (APK 1.25.3), versao serverless para Vercel.

## Deploy (2 minutos)
1. Entra em vercel.com/new com a conta GitHub
2. Importa este repositorio
3. IMPORTANTE: nomeia o projeto exatamente `rzim2018`
   (o dominio final precisa ser rzim2018.vercel.app)
4. Deploy

## Rotas espelhadas
- /ver.php, /app/info/get, /health
- /oauth/guest/register, /oauth/guest/token/grant, /oauth/token, /oauth/token/inspect
- /oauth/user/info/get, /me, /api/heartbeat, /api/msdk
- /live/* (catch-all do lobby)

Logs de todas as chamadas aparecem no dashboard do Vercel (tab Logs).
