package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	pool, err := pgxpool.New(context.Background(), "postgresql://postgres:SDDyuSvBSUVpZTFLoLunxKSevXAnLHrD@mainline.proxy.rlwy.net:21430/railway")
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	var d1 string
	var d2 string
	err = pool.QueryRow(context.Background(), `SELECT "readingDate", "readingDate"::text FROM "YtbsInstantProduction" LIMIT 1`).Scan(&d1, &d2)
	fmt.Printf("Default string: %v\n", d1)
	fmt.Printf("Cast to text: %v\n", d2)
}
