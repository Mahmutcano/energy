package models

import (
	"time"

	"github.com/google/uuid"
)

// Company represents an energy generation company with YTBS credentials.
type Company struct {
	ID            uuid.UUID `json:"id" db:"id"`
	Name          string    `json:"name" db:"name"`
	TaxNumber     string    `json:"taxNumber" db:"tax_number"`
	TaxOffice     string    `json:"taxOffice" db:"tax_office"`
	ContactPerson string    `json:"contactPerson" db:"contact_person"`
	Email         string    `json:"email" db:"email"`
	Phone         string    `json:"phone" db:"phone"`
	YTBSUsername  string    `json:"ytbsUsername" db:"ytbs_username"`
	YTBSPassword       string     `json:"ytbsPassword" db:"ytbs_password"`
	YTBSApiKey         string     `json:"ytbsApiKey" db:"ytbs_api_key"`
	LicenseNo          string     `json:"licenseNo" db:"license_no"`
	YTBSToken          string     `json:"ytbsToken" db:"ytbs_token"`
	YTBSTokenUpdatedAt *time.Time `json:"ytbsTokenUpdatedAt,omitempty" db:"ytbs_token_updated_at"`
	IsActive           bool       `json:"isActive" db:"is_active"`
	CreatedAt          time.Time  `json:"createdAt" db:"created_at"`
	PlantCount    int       `json:"plantCount,omitempty" db:"plant_count"`
}

// User represents an application user (Sistem Admin or Santral Sahibi).
type User struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	CompanyID    *uuid.UUID `json:"companyId" db:"company_id"`
	CompanyName  string     `json:"companyName,omitempty" db:"company_name"`
	Username     string     `json:"username" db:"username"`
	FullName     string     `json:"fullName" db:"full_name"`
	Email        string     `json:"email" db:"email"`
	PasswordHash string     `json:"-" db:"password_hash"`
	Role         string     `json:"role" db:"role"` // "system_admin" veya "plant_owner"
	IsActive     bool       `json:"isActive" db:"is_active"`
	CreatedAt    time.Time  `json:"createdAt" db:"created_at"`
}

// Plant represents an energy generation plant (GES, RES, etc.) linked to a company.
type Plant struct {
	ID          uuid.UUID `json:"id" db:"id"`
	CompanyID   uuid.UUID `json:"companyId" db:"company_id"`
	CompanyName string    `json:"companyName,omitempty" db:"company_name"`
	PlantName   string    `json:"plantName" db:"plant_name"`
	PlantType   string    `json:"plantType" db:"plant_type"` // GES, RES, BIOGAS, HES
	CapacityMW  float64   `json:"capacityMw" db:"capacity_mw"`
	YTBSPlantID int       `json:"ytbsPlantId" db:"ytbs_plant_id"` // TEIAS Lisanssiz Santral ID
	CanSendYTBS bool      `json:"canSendYtbs" db:"can_send_ytbs"`
	PeriodType  string    `json:"periodType" db:"period_type"` // "15m", "1h", "both"
	City        string    `json:"city" db:"city"`
	District    string    `json:"district" db:"district"`
	IsActive    bool      `json:"isActive" db:"is_active"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
}

// DataDefinition represents a telemetry tag/parameter mapping for a plant.
type DataDefinition struct {
	ID                 uuid.UUID `json:"id" db:"id"`
	PlantID            uuid.UUID `json:"plantId" db:"plant_id"`
	PlantName          string    `json:"plantName,omitempty" db:"plant_name"`
	ParameterName      string    `json:"parameterName" db:"parameter_name"` // "Aktif Güç MW", "Üretilen Aktif MWh"
	DataType           string    `json:"dataType" db:"data_type"`           // "INSTANT_MW", "HOURLY_MWH", "TOTAL_INDEX"
	Unit               string    `json:"unit" db:"unit"`                     // "MW", "MWh", "kW", "kWh"
	SourceTagOrColumn  string    `json:"sourceTagOrColumn" db:"source_tag_or_column"`
	Multiplier         float64   `json:"multiplier" db:"multiplier"`
	IsActive           bool      `json:"isActive" db:"is_active"`
	CreatedAt          time.Time `json:"createdAt" db:"created_at"`
}

// TransmissionLog represents an audited record of data sent to YTBS.
type TransmissionLog struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	PlantID          uuid.UUID  `json:"plantId" db:"plant_id"`
	PlantName        string     `json:"plantName,omitempty" db:"plant_name"`
	CompanyID        uuid.UUID  `json:"companyId" db:"company_id"`
	CompanyName      string     `json:"companyName,omitempty" db:"company_name"`
	LicenseNo        string     `json:"licenseNo,omitempty" db:"license_no"`
	YTBSPlantID      int        `json:"ytbsPlantId,omitempty" db:"ytbs_plant_id"`
	TransmissionType string     `json:"transmissionType" db:"transmission_type"` // "INSTANT", "HOURLY"
	ReadingDate      string     `json:"readingDate" db:"reading_date"`           // "YYYY-MM-DD"
	ReadingTime      string     `json:"readingTime" db:"reading_time"`           // "HH:mm" or "HH:00"
	Value            float64    `json:"value" db:"value"`
	Status           string     `json:"status" db:"status"` // "SUCCESS", "FAILED", "PENDING"
	RetryCount       int        `json:"retryCount" db:"retry_count"`
	YTBSResponseCode int        `json:"ytbsResponseCode" db:"ytbs_response_code"`
	YTBSResponseBody string     `json:"ytbsResponseBody" db:"ytbs_response_body"`
	ErrorMessage     string     `json:"errorMessage" db:"error_message"`
	IsManualEntry    bool       `json:"isManualEntry" db:"is_manual_entry"`
	SentAt           *time.Time `json:"sentAt" db:"sent_at"`
	CreatedAt        time.Time  `json:"createdAt" db:"created_at"`
}

// DashboardStats holds summary KPI metrics.
type DashboardStats struct {
	TotalCompanies     int     `json:"totalCompanies"`
	TotalPlants        int     `json:"totalPlants"`
	TodayTransmissions int     `json:"todayTransmissions"`
	TotalTransmissions int     `json:"totalTransmissions"`
	TotalInstant       int     `json:"totalInstant"`
	TotalHourly        int     `json:"totalHourly"`
	TotalSuccess       int     `json:"totalSuccess"`
	SuccessRate        float64 `json:"successRate"`
	FailedCount        int     `json:"failedCount"`
	PendingCount       int     `json:"pendingCount"`
	LastTransmissionAt string  `json:"lastTransmissionAt"`
}
