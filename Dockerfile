# Stage 1: Build Frontend (Next.js Static Export)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go Backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app
RUN apk update && apk add --no-cache git tzdata ca-certificates
# Set Go environment variables
ENV CGO_ENABLED=0
# Download dependencies
COPY backend-go/go.mod backend-go/go.sum ./backend-go/
RUN cd backend-go && go mod download
# Copy source
COPY . .
# Build the binary
RUN cd backend-go && go build -a -installsuffix cgo -o scada-server ./cmd/server/main.go

# Stage 3: Minimal Runtime Image
FROM alpine:latest  
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
# Copy binary
COPY --from=backend-builder /app/backend-go/scada-server .
# Copy frontend static files (will be served by Go)
COPY --from=frontend-builder /app/frontend/out ./public
# Copy .env file if it exists (optional, Railway usually provides env vars via UI)
# COPY .env .

EXPOSE 3001
CMD ["./scada-server"]
