# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk update && apk add --no-cache git tzdata ca-certificates

ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -ldflags="-w -s" -o ytbs-server ./cmd/server/main.go

# Final Minimal Stage
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata

ENV TZ=Europe/Istanbul

WORKDIR /app

COPY --from=builder /app/ytbs-server .

EXPOSE 8080

CMD ["./ytbs-server"]
