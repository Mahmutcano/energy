FROM golang:alpine AS builder

WORKDIR /app

# Install git for fetch and tzdata for timezones
RUN apk update && apk add --no-cache git tzdata

# Set environment variables for statically linked Go binary
ENV CGO_ENABLED=0
ENV GOOS=linux

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the Go app
RUN go build -a -installsuffix cgo -o scada-server ./cmd/server/main.go

# Start a new minimal stage from scratch
FROM alpine:latest  

# Add root certificates and timezone data
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the pre-built binary
COPY --from=builder /app/scada-server .

EXPOSE 3001

# Command to run the executable
CMD ["./scada-server"]
