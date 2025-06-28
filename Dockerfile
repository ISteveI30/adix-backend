# 1️⃣ Etapa de Depedencias
FROM node:alpine3.21 AS deps

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./
COPY prisma ./prisma

RUN npm install

# 2️⃣ Etapa de construcción
FROM node:alpine3.21 AS builder

ARG ADIX_DATABASE_URL
ENV DATABASE_URL=$ADIX_DATABASE_URL

# Imprimir el arg para ver el valor recibido
RUN echo "database_url ::: $DATABASE_URL";

WORKDIR /usr/src/app

# Copiar de deps, los módulos de node
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/prisma ./prisma
# Copiar todo el codigo fuente de la aplicación
COPY . .

RUN npx prisma migrate deploy
RUN npx prisma generate


# RUN npm run test
RUN npm run build

RUN npm ci -f --only=production && npm cache clean --force

# 3️⃣ Etapa de producción
FROM node:alpine3.21 AS production

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

USER node

EXPOSE 4000

CMD ["node", "dist/main.js"]