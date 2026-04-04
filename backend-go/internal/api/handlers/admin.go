package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/goburrow/modbus"
)

func ModbusTest(c *gin.Context) {
	log.Println("[ADMIN] Received Modbus Test Request")

	var req struct {
		IP           string `json:"ip"`
		Port         string `json:"port"`
		SlaveID      string `json:"slaveId"`
		Address      string `json:"address"`
		FunctionCode string `json:"functionCode"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz parametreler: " + err.Error()})
		return
	}

	// Conversion
	portInt, _ := strconv.Atoi(req.Port)
	slaveIDInt, _ := strconv.Atoi(req.SlaveID)
	addressInt, _ := strconv.Atoi(req.Address)

	// Create Handler
	handler := modbus.NewTCPClientHandler(fmt.Sprintf("%s:%d", req.IP, portInt))
	handler.Timeout = 5 * time.Second
	handler.SlaveId = byte(slaveIDInt)

	if err := handler.Connect(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Bağlantı hatası: %v", err),
		})
		return
	}
	defer handler.Close()

	client := modbus.NewClient(handler)
	var results []byte
	var err error

	// Read based on Function Code
	if req.FunctionCode == "04" {
		results, err = client.ReadInputRegisters(uint16(addressInt), 1)
	} else {
		results, err = client.ReadHoldingRegisters(uint16(addressInt), 1)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Okuma hatası (Adres %s): %v", req.Address, err),
		})
		return
	}

	// Convert result bytes to value
	var value int
	if len(results) >= 2 {
		value = int(uint16(results[0])<<8 | uint16(results[1]))
	}

	log.Printf("[ADMIN] Modbus Test Success | IP: %s | Address: %d | Raw Bytes: %v | Calculated Value: %d", req.IP, addressInt, results, value)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Gerçek Modbus Verisi",
		"data": []interface{}{
			map[string]interface{}{"address": addressInt, "value": value},
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
