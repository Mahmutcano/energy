FROM node:20-alpine AS builder

WORKDIR /app

# Sadece bağımlılık dosyalarını al
COPY package*.json ./

# Modülleri yükle
RUN npm install

# Tüm dosyaları kopyala (prisma klasörü de dahil olur)
COPY . .

# Prisma istemcisini oluştur
RUN npx prisma generate

# Uygulamayı derle
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "run", "start"]
