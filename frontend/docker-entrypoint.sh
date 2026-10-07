#!/bin/sh
set -e

mkdir -p /etc/nginx/certs

if [ ! -f /etc/nginx/certs/apmonitora.crt ] || [ ! -f /etc/nginx/certs/apmonitora.key ]; then
    echo "🔑 Gerando certificado SSL autoassinado em /etc/nginx/certs..."
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/nginx/certs/apmonitora.key \
        -out /etc/nginx/certs/apmonitora.crt \
        -subj "/C=BR/ST=SP/L=Local/O=apMonitora/CN=apmonitora.local"
    echo "✅ Certificado SSL autoassinado criado com sucesso!"
fi
