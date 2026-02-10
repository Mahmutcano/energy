FROM node:20-alpine AS builder

WORKDIR /app

# Dosyaların varlığını garantiye almak için tek tek kopyalıyoruz
# Eğer burada hata alırsanız, Railway "Root Directory" ayarı yapılmamış demektir.
COPY package.json ./
COPY package-lock.json ./

RUN npm install

# Geri kalan her şeyi kopyala
COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "run", "start"]
