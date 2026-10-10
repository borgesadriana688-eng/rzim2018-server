#!/data/data/com.termux/files/usr/bin/bash
# ESPIAO MID5 v7 — FRIDA (captura nativo e Java juntos)
B='\033[1m'; G='\033[32m'; Y='\033[33m'; C='\033[36m'; R='\033[31m'; N='\033[0m'
clear
echo -e "${C}${B}"
echo "  =============================="
echo "   ESPIAO MID5 v7 — Rzim FF2023"
echo "  =============================="
echo -e "${N}"

# Cria o hook que intercepta funcoes de rede (Java e IL2CPP/libc)
HOOK="/data/local/tmp/ff_hook.js"
cat > "$HOOK" <<'JS'
// Hook de funcoes de rede (Frida)
function logNet(msg) {
    console.log("[FRIDA] " + msg);
}
Java.perform(function() {
    try {
        var URL = Java.use("java.net.URL");
        URL.openConnection.overload().implementation = function() {
            logNet("Conectando (Java): " + this.toString());
            return this.openConnection();
        };
    } catch(e) {}
});
Interceptor.attach(Module.findExportByName("libc.so", "connect"), {
    onEnter: function(args) {
        var sock = args[0].toInt32();
        var sockaddr = args[1];
        var family = sockaddr.readU16();
        if (family === 2) { // AF_INET
            var port = ((sockaddr.add(2).readU8() & 0xFF) << 8) | (sockaddr.add(3).readU8() & 0xFF);
            var ip = sockaddr.add(4).readU8() + "." + sockaddr.add(5).readU8() + "." + sockaddr.add(6).readU8() + "." + sockaddr.add(7).readU8();
            logNet("Conectando (C++): " + ip + ":" + port);
        }
    }
});
JS

echo -e "${G}[*] Script de espião salvo em: $HOOK${N}"
echo -e "${Y}[!] IMPORTANTE: Se der 'Permission denied', tu precisa root pra copiar pra /data/local/tmp/${N}"
echo -e "${Y}[!] Ou entao usa 'adb push $HOOK /data/local/tmp/' se tiver depuracao ligada.${N}"
echo ""
echo -e "${B}[*] Abre o ${G}Spy_MID5 (v3)\${N}${B} e olha o logcat (adb logcat -s Frida)${N}"
