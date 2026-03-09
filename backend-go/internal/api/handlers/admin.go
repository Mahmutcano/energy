package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func ModbusTest(c *gin.Context) {
	log.Println("[ADMIN] Received Modbus Test Request")
	// Return a dummy successful response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Modbus Test Dummy Data",
		"data": []interface{}{
			map[string]interface{}{"address": 40001, "value": 123},
		},
	})
}

func IEC104Test(c *gin.Context) {
	log.Println("[ADMIN] Received IEC104 Test Request")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "IEC104 Test Dummy Data",
		"data":    []interface{}{},
	})
}

func IEC104GI(c *gin.Context) {
	log.Println("[ADMIN] Received IEC104 GI Command")
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "GI Command Sent",
		"timestamp": time.Now(),
	})
}
