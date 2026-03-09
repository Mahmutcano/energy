package api

import (
	"log"

	"github.com/zishang520/socket.io/v2/socket"
)

var SocketServer *socket.Server

func InitSocket() *socket.Server {
	// Initialize with default options
	io := socket.NewServer(nil, nil)
	SocketServer = io

	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		log.Printf("[SOCKET] Client connected: %s", client.Id())

		client.On("disconnect", func(reasons ...any) {
			log.Printf("[SOCKET] Client disconnected: %s Reason: %v", client.Id(), reasons[0])
		})
	})

	return io
}
