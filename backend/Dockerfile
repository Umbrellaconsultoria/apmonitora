FROM node:20-alpine

# Instalar OpenSSL para o Prisma Client
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar os arquivos de manifesto de pacotes
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar todo o código-fonte da aplicação (respeitando o .dockerignore)
COPY . .

# Gerar o cliente Prisma com o schema do projeto
RUN npx prisma generate

# Criar pasta de uploads se não existir
RUN mkdir -p uploads/rostos

EXPOSE 3001

# Script de inicialização que roda as migrations e inicia o servidor
CMD ["sh", "-c", "npx prisma db push && npm start"]
