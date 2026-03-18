package response

import (
	"github.com/gin-gonic/gin"
)

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type APIResponse struct {
	Success bool      `json:"success"`
	Error   *APIError `json:"error,omitempty"`
	Data    any       `json:"data,omitempty"`
}

// Error sends a standardized error response
func Error(c *gin.Context, statusCode int, errorCode string, message string) {
	c.JSON(statusCode, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    errorCode,
			Message: message,
		},
	})
	c.Abort()
}

// Success sends a standardized success response
func Success(c *gin.Context, statusCode int, data any) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Data:    data,
	})
}

const (
	ErrInvalidInput = "ERR_INVALID_INPUT"
	ErrNotFound     = "ERR_NOT_FOUND"
	ErrDatabase     = "ERR_DATABASE"
	ErrUnauthorized = "ERR_UNAUTHORIZED"
	ErrInternal     = "ERR_INTERNAL"
)
