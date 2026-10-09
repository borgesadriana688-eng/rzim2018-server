#!/usr/bin/env python3
# BRAYAN LOBBY 1.43 — remendo do APK pro Vercel (brayan1.vercel.app)
# Uso: python3 patch_brayan1.py <APK-entrada.apk>
# Saida: <APK>-brayan1.apk (sem assinatura; assine com uber-apk-signer)
# Troca byte-a-byte (MESMO tamanho, 32 bytes) o verAddr em global-metadata.dat:
#   http://179.198.108.48:3000/live/  -> https://brayan1.vercel.app/live/
#   http://127.0.0.1:000018000/live/  -> https://brayan1.vercel.app/live/
import sys, os, zipfile, shutil, tempfile

ALVOS = [
    b'http://179.198.108.48:3000/live/',
    b'http://127.0.0.1:000018000/live/',
]
NOVO = b'https://brayan1.vercel.app/live/'
assert len(NOVO) == 32

def main():
    if len(sys.argv) < 2:
        print('uso: python3 patch_brayan1.py <apk>'); sys.exit(1)
    entrada = sys.argv[1]
    saida = entrada.rsplit('.', 1)[0] + '-brayan1.apk'
    zin = zipfile.ZipFile(entrada, 'r')
    # acha o global-metadata.dat
    meta = [n for n in zin.namelist() if n.endswith('global-metadata.dat')]
    if not meta:
        print('ERRO: global-metadata.dat nao achado no APK'); sys.exit(1)
    nome_meta = meta[0]
    dados = zin.read(nome_meta)
    alvo = None
    for a in ALVOS:
        if dados.count(a) >= 1:
            alvo = a; break
    if not alvo:
        print('ERRO: verAddr original nao achado (APK ja remendado ou errado?)'); sys.exit(1)
    dados2 = dados.replace(alvo, NOVO)
    print('remendo: %s x%d -> %s (%d -> %d bytes, prefixos intactos)' %
          (alvo.decode(), dados.count(alvo), NOVO.decode(), len(alvo), len(NOVO)))
    # copia o zip inteiro trocando so o metadata
    tmp = saida + '.tmp'
    with zipfile.ZipFile(tmp, 'w') as zout:
        for item in zin.infolist():
            if item.filename == nome_meta:
                zout.writestr(item, dados2)
            else:
                zout.writestr(item, zin.read(item.filename))
    zin.close()
    shutil.move(tmp, saida)
    print('OK:', saida)
    print('agora assine: java -jar uber-apk-signer*.jar --apks ' + saida)

if __name__ == '__main__':
    main()
