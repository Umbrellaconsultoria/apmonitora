# Estágio 1: Build do frontend com Node.js
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Estágio 2: Servidor Nginx de alta performance com HTTPS
FROM nginx:alpine

# Instalar OpenSSL para a geração do certificado SSL autoassinado
RUN apk add --no-cache openssl

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Script de inicialização para gerar certificado SSL caso não exista
COPY docker-entrypoint.sh /docker-entrypoint.d/40-ssl-init.sh
RUN chmod +x /docker-entrypoint.d/40-ssl-init.sh

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
