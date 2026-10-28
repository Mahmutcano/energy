package handlers

import (
	"bytes"
	"encoding/csv"
	"io"
	"net/http"
	"strconv"
	"strings"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/models"
	"ytbs-platform/internal/repository"
	"ytbs-platform/web"

	"github.com/google/uuid"
)

type DataDefHandler struct {
	dataDefRepo *repository.DataDefRepository
	plantRepo   *repository.PlantRepository
}

func NewDataDefHandler(dataDefRepo *repository.DataDefRepository, plantRepo *repository.PlantRepository) *DataDefHandler {
	return &DataDefHandler{
		dataDefRepo: dataDefRepo,
		plantRepo:   plantRepo,
	}
}

func (h *DataDefHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetCurrentUser(r)

	var filterPlantID *uuid.UUID
	plantIDStr := r.URL.Query().Get("plantId")
	if plantIDStr != "" {
		if pid, err := uuid.Parse(plantIDStr); err == nil {
			filterPlantID = &pid
		}
	}

	defs, err := h.dataDefRepo.GetAll(ctx, filterPlantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	plants, _ := h.plantRepo.GetAll(ctx, nil)

	data := map[string]interface{}{
		"Title":           "Veri & Tag Tanımlama",
		"ActiveNav":       "data_definitions",
		"User":            user,
		"Defs":            defs,
		"Plants":          plants,
		"SelectedPlantID": plantIDStr,
	}

	_ = web.RenderTemplate(w, "data_definitions.html", data)
}

func (h *DataDefHandler) Create(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	plantID, err := uuid.Parse(r.FormValue("plantId"))
	if err != nil {
		http.Error(w, "Geçersiz Santral", http.StatusBadRequest)
		return
	}

	multiplier, _ := strconv.ParseFloat(r.FormValue("multiplier"), 64)
	if multiplier == 0 {
		multiplier = 1.0
	}

	def := &models.DataDefinition{
		PlantID:           plantID,
		ParameterName:     r.FormValue("parameterName"),
		DataType:          r.FormValue("dataType"),
		Unit:              r.FormValue("unit"),
		SourceTagOrColumn: r.FormValue("sourceTagOrColumn"),
		Multiplier:        multiplier,
		IsActive:          true,
	}

	if err := h.dataDefRepo.Create(r.Context(), def); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/data-definitions?plantId="+plantID.String(), http.StatusSeeOther)
}

func (h *DataDefHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	plantIDStr := r.FormValue("plantId")

	_ = h.dataDefRepo.Delete(r.Context(), id)
	redirectURL := "/data-definitions"
	if plantIDStr != "" {
		redirectURL += "?plantId=" + plantIDStr
	}
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// DownloadTemplate serves an Excel-compatible CSV template file with UTF-8 BOM
func (h *DataDefHandler) DownloadTemplate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\"ytbs_scada_tag_sablonu.csv\"")

	// UTF-8 BOM so Microsoft Excel opens Turkish characters cleanly
	var buf bytes.Buffer
	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(&buf)
	writer.Comma = ';' // Semicolon is Excel's standard delimiter in Turkish locale

	_ = writer.Write([]string{"Parametre Adı", "SCADA Tag", "Veri Türü", "Birim", "Çarpan"})
	_ = writer.Write([]string{"Aktif Güç (15 Dk Anlık)", "Active Power (P)", "INSTANT_MW", "MW", "0.001"})
	_ = writer.Write([]string{"Net Üretilen Enerji (1 Saatlik)", "Supplied Active Energy", "HOURLY_MWH", "MWh", "0.001"})
	_ = writer.Write([]string{"Faz Gerilimi L1", "Voltage L1", "PHASE_VOLTAGE", "V", "1.0"})
	_ = writer.Write([]string{"Faz Akımı L1", "Current L1", "PHASE_CURRENT", "A", "1.0"})
	_ = writer.Write([]string{"Şebeke Frekansı", "Frequency", "FREQUENCY", "Hz", "1.0"})
	_ = writer.Write([]string{"Kümülatif Sayaç Endeksi", "Total Energy Index", "TOTAL_INDEX", "MWh", "1.0"})
	writer.Flush()

	w.Write(buf.Bytes())
}

// ImportExcelOrCSV processes an uploaded CSV/Excel file with tag definitions for a specific plant
func (h *DataDefHandler) ImportExcelOrCSV(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Dosya boyutu çok büyük veya geçersiz form verisi", http.StatusBadRequest)
		return
	}

	plantIDStr := r.FormValue("plantId")
	plantID, err := uuid.Parse(plantIDStr)
	if err != nil {
		http.Error(w, "Geçersiz veya seçilmemiş Santral", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Yüklenecek dosya bulunamadı", http.StatusBadRequest)
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Dosya okunamadı: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Strip UTF-8 BOM if present
	if bytes.HasPrefix(fileBytes, []byte{0xEF, 0xBB, 0xBF}) {
		fileBytes = bytes.TrimPrefix(fileBytes, []byte{0xEF, 0xBB, 0xBF})
	}

	// Detect comma or semicolon separator
	contentStr := string(fileBytes)
	delimiter := ';'
	if !strings.Contains(contentStr, ";") && strings.Contains(contentStr, ",") {
		delimiter = ','
	}

	reader := csv.NewReader(strings.NewReader(contentStr))
	reader.Comma = delimiter
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	records, err := reader.ReadAll()
	if err != nil {
		http.Error(w, "CSV ayrıştırma hatası: "+err.Error(), http.StatusBadRequest)
		return
	}

	if len(records) <= 1 {
		http.Error(w, "Dosya başlık dışında herhangi bir veri satırı içermiyor", http.StatusBadRequest)
		return
	}

	var defs []models.DataDefinition
	for i, row := range records {
		if i == 0 {
			// Skip header row
			continue
		}
		if len(row) < 3 {
			continue
		}

		paramName := strings.TrimSpace(row[0])
		if paramName == "" {
			continue
		}

		scadaTag := strings.TrimSpace(row[1])
		dataType := strings.TrimSpace(row[2])
		unit := ""
		if len(row) > 3 {
			unit = strings.TrimSpace(row[3])
		}
		multiplier := 1.0
		if len(row) > 4 {
			rawMul := strings.ReplaceAll(strings.TrimSpace(row[4]), ",", ".")
			if m, err := strconv.ParseFloat(rawMul, 64); err == nil && m != 0 {
				multiplier = m
			}
		}

		// Normalize data types
		upperType := strings.ToUpper(dataType)
		if strings.Contains(upperType, "INSTANT") || strings.Contains(upperType, "15") || upperType == "MW" {
			dataType = "INSTANT_MW"
		} else if strings.Contains(upperType, "HOURLY") || strings.Contains(upperType, "SAAT") || upperType == "MWH" {
			dataType = "HOURLY_MWH"
		} else if strings.Contains(upperType, "VOLT") || strings.Contains(upperType, "GERILIM") {
			dataType = "PHASE_VOLTAGE"
		} else if strings.Contains(upperType, "CURR") || strings.Contains(upperType, "AKIM") {
			dataType = "PHASE_CURRENT"
		} else if strings.Contains(upperType, "FREQ") || strings.Contains(upperType, "FREKANS") {
			dataType = "FREQUENCY"
		} else if strings.Contains(upperType, "INDEX") || strings.Contains(upperType, "ENDEKS") {
			dataType = "TOTAL_INDEX"
		}

		defs = append(defs, models.DataDefinition{
			PlantID:           plantID,
			ParameterName:     paramName,
			DataType:          dataType,
			Unit:              unit,
			SourceTagOrColumn: scadaTag,
			Multiplier:        multiplier,
			IsActive:          true,
		})
	}

	if len(defs) > 0 {
		_, _ = h.dataDefRepo.BulkCreate(r.Context(), defs)
	}

	http.Redirect(w, r, "/data-definitions?plantId="+plantID.String(), http.StatusSeeOther)
}

// CloneDefinitions copies all definitions from a source plant to a target plant
func (h *DataDefHandler) CloneDefinitions(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	sourcePlantID, err1 := uuid.Parse(r.FormValue("sourcePlantId"))
	targetPlantID, err2 := uuid.Parse(r.FormValue("targetPlantId"))
	if err1 != nil || err2 != nil {
		http.Error(w, "Geçersiz kaynak veya hedef santral", http.StatusBadRequest)
		return
	}

	_, _ = h.dataDefRepo.Clone(r.Context(), sourcePlantID, targetPlantID)
	http.Redirect(w, r, "/data-definitions?plantId="+targetPlantID.String(), http.StatusSeeOther)
}
