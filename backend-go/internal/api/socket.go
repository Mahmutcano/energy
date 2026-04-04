package api

import (
	"log"
	"strings"

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

		client.On("join:protocol", func(args ...any) {
			data := args[0].(map[string]interface{})
			if pID, ok := data["protocolId"].(string); ok {
				room := "protocol:" + strings.ToLower(pID)
				client.Join(socket.Room(room))
				log.Printf("[SOCKET] Client %s joined room: %s", client.Id(), room)
			}
		})

		client.On("disconnect", func(reasons ...any) {
			log.Printf("[SOCKET] Client disconnected: %s Reason: %v", client.Id(), reasons[0])
		})
	})

	log.Println("[SOCKET] Socket.io Server Initialized")
	return io
}
