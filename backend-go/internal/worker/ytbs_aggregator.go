package worker

import (
	"context"
	"log"
	"time"
)

type YtbsAggregator struct{}

func NewYtbsAggregator() *YtbsAggregator {
	return &YtbsAggregator{}
}

func (w *YtbsAggregator) Start(ctx context.Context) {
	log.Println("[YTBS-AGG] Aggregator started (AUTO-INSERT DISABLED)...")
	
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case t := <-ticker.C:
			mins := t.Minute()
			if mins == 5 {
				log.Println("[YTBS-AGG] Checking Hourly Aggregation (Skipping)...")
			}
			if mins == 2 || mins == 17 || mins == 32 || mins == 47 {
				log.Println("[YTBS-AGG] Checking 15-min Aggregation (Skipping)...")
			}
		}
	}
}

func (w *YtbsAggregator) AggregateHourly() {
	// Manual only mode
}

func (w *YtbsAggregator) AggregateInstant() {
	// Manual only mode
}
