package models

import (
	"time"

	"github.com/google/uuid"
)

type AppUser struct {
	ID        uuid.UUID  `json:"id"`
	UserCode  string     `json:"userCode"`
	FirstName string     `json:"firstName"`
	LastName  string     `json:"lastName"`
	Email     string     `json:"email"`
	AdminType string     `json:"adminType"`
	IsActive  bool       `json:"isActive"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	CreatedBy *uuid.UUID `json:"createdBy"`
	UpdatedBy *uuid.UUID `json:"updatedBy"`
}

type Plant struct {
	ID          uuid.UUID  `json:"id"`
	CompanyID   uuid.UUID  `json:"companyId"`
	PlantName   string     `json:"plantName"`
	PlantType   string     `json:"plantType"`
	Latitude    *float64   `json:"latitude"`
	Longitude   *float64   `json:"longitude"`
	IsActive    bool       `json:"isActive"`
	CompanyName string     `json:"companyName,omitempty"`
	YTBSCode    string     `json:"ytbsCode"`
	CanSendYTBS bool       `json:"canSendYtbs"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	CreatedBy   *uuid.UUID `json:"createdBy"`
	UpdatedBy   *uuid.UUID `json:"updatedBy"`
}


type Device struct {
	ID                 uuid.UUID  `json:"id"`
	ProtocolConfigID   uuid.UUID  `json:"protocolConfigId"`
	DeviceName         string     `json:"deviceName"`
	DeviceType         string     `json:"deviceType"`
	IsActive           bool       `json:"isActive"`
	DatasheetProfileID *uuid.UUID `json:"datasheetProfileId"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
	CreatedBy          *uuid.UUID `json:"createdBy"`
	UpdatedBy          *uuid.UUID `json:"updatedBy"`
}

type ModbusConfig struct {
	ID         uuid.UUID `json:"id"`
	ProtocolID uuid.UUID `json:"protocolId"`
	IPAddress  string    `json:"ipAddress"`
	Port       int       `json:"port"`
	SlaveID    int       `json:"slaveId"`
	Timeout    int       `json:"timeout"`
	RetryCount int       `json:"retryCount"`
}

type IEC104Config struct {
	ID         uuid.UUID `json:"id"`
	ProtocolID uuid.UUID `json:"protocolId"`
	IPAddress  string    `json:"ipAddress"`
	Port       int       `json:"port"`
	ASDUAddr   int       `json:"asduAddr"`
	T0         int       `json:"t0"`
	T1         int       `json:"t1"`
	T2         int       `json:"t2"`
	T3         int       `json:"t3"`
	K          int       `json:"k"`
	W          int       `json:"w"`
}

type PointToPoll struct {
	Address      int       `json:"address"`
	DeviceID     uuid.UUID `json:"deviceId"`
	PointID      uuid.UUID `json:"pointId"`
	Name         string    `json:"name"`
	Unit         string    `json:"unit"`
	FunctionCode int       `json:"functionCode"`
	Multiplier   float64   `json:"multiplier"`
	WordSwap     bool      `json:"wordSwap"`
	DataType     string    `json:"dataType"`
	IsRecording  bool      `json:"isRecording"`
}

type TelemetryData struct {
	ProtocolID uuid.UUID   `json:"protocolId"`
	DeviceID   uuid.UUID   `json:"deviceId"`
	PointID    uuid.UUID   `json:"pointId"`
	IOA        int         `json:"ioa"`
	Value      interface{} `json:"value"`
	Unit       string      `json:"unit"`
	Name       string      `json:"name"`
	Timestamp  time.Time   `json:"timestamp"`
}
