package api

import (
	"log"

	"github.com/zishang520/socket.io/v2/socket"
)

var SocketServer *socket.Server

func InitSocket() *socket.Server {
	// Stage ortamında daha kararlı bağlantı için opsiyonları belirliyoruz
	opts := socket.DefaultServerOptions()
	opts.SetAllowEIO3(true)

	io := socket.NewServer(nil, opts)
	SocketServer = io

	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		log.Printf("[SOCKET] Client connected: %s | Transport: %v", client.Id(), client.Conn().Transport().Name())

		client.On("disconnect", func(reasons ...any) {
			log.Printf("[SOCKET] Client disconnected: %s Reason: %v", client.Id(), reasons[0])
		})
	})

	log.Println("[SOCKET] Socket.io Server Initialized")
	return io
}
