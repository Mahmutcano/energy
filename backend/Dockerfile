FROM node:20-alpine AS builder

WORKDIR /app

# Yolları root dizinine göre güncelledik (backend/...)
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Backend klasörüne girip install yapıyoruz
RUN cd backend && npm install

# Her şeyi kopyala
COPY . .

# Backend klasöründe generate ve build yap
RUN cd backend && npx prisma generate
RUN cd backend && npm run build

FROM node:20-alpine

WORKDIR /app

# Production imajı için gerekli dosyaları kopyala
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/prisma ./backend/prisma

EXPOSE 3001

# Çalıştırırken de backend klasöründen başlatıyoruz
CMD ["node", "backend/dist/server.js"]
