FROM node:20-alpine AS builder

WORKDIR /app

# Root'tan kopyalıyoruz
COPY backend/package*.json ./backend/
COPY backend/prisma/ ./backend/prisma/

RUN cd backend && npm install

COPY . .

RUN cd backend && npx prisma generate
RUN cd backend && npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/prisma ./backend/prisma

EXPOSE 3001

CMD ["node", "backend/dist/server.js"]
