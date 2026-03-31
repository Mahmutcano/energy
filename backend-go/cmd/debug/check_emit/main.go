package main

import (
"fmt"
"github.com/zishang520/socket.io/v2/socket"
)

func main() {
	io := socket.NewServer(nil, nil)
	fmt.Printf("%T\n", io.Sockets())
}
