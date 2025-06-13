// packages/go/client.go
package nestjs_sdk

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "time"
)

type ApiClientConfig struct {
    BaseURL    string
    ApiKey     string
    Timeout    time.Duration
    Retries    int
    RetryDelay time.Duration
    Debug      bool
}

type ApiResponse struct {
    Data    interface{}       `json:"data"`
    Status  int              `json:"status"`
    Headers map[string]string `json:"headers"`
    Success bool             `json:"success"`
}

type ApiError struct {
    Message string      `json:"message"`
    Status  int         `json:"status"`
    Code    string      `json:"code"`
    Details interface{} `json:"details,omitempty"`
}

func (e *ApiError) Error() string {
    return fmt.Sprintf("API Error %d (%s): %s", e.Status, e.Code, e.Message)
}

type ApiClient struct {
    config     ApiClientConfig
    httpClient *http.Client
}

func NewApiClient(config ApiClientConfig) *ApiClient {
    if config.Timeout == 0 {
        config.Timeout = 30 * time.Second
    }
    if config.Retries == 0 {
        config.Retries = 3
    }
    if config.RetryDelay == 0 {
        config.RetryDelay = time.Second
    }

    return &ApiClient{
        config: config,
        httpClient: &http.Client{
            Timeout: config.Timeout,
        },
    }
}

func (c *ApiClient) makeRequest(method, endpoint string, body interface{}) (*ApiResponse, error) {
    fullURL, err := url.JoinPath(c.config.BaseURL, endpoint)
    if err != nil {
        return nil, fmt.Errorf("invalid URL: %w", err)
    }

    var requestBody io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, fmt.Errorf("failed to marshal request body: %w", err)
        }
        requestBody = bytes.NewReader(jsonBody)
    }

    var lastErr error
    for attempt := 0; attempt <= c.config.Retries; attempt++ {
        req, err := http.NewRequest(method, fullURL, requestBody)
        if err != nil {
            return nil, fmt.Errorf("failed to create request: %w", err)
        }

        req.Header.Set("Content-Type", "application/json")
        if c.config.ApiKey != "" {
            req.Header.Set("Authorization", "Bearer "+c.config.ApiKey)
        }

        if c.config.Debug {
            fmt.Printf("[API Client] %s %s\n", method, fullURL)
        }

        resp, err := c.httpClient.Do(req)
        if err != nil {
            lastErr = err
            if attempt < c.config.Retries {
                time.Sleep(c.config.RetryDelay * time.Duration(attempt+1))
                continue
            }
            break
        }
        defer resp.Body.Close()

        responseBody, err := io.ReadAll(resp.Body)
        if err != nil {
            return nil, fmt.Errorf("failed to read response body: %w", err)
        }

        headers := make(map[string]string)
        for key, values := range resp.Header {
            if len(values) > 0 {
                headers[key] = values[0]
            }
        }

        if resp.StatusCode >= 400 {
            var errorData map[string]interface{}
            json.Unmarshal(responseBody, &errorData)
            
            message := "Request failed"
            code := "UNKNOWN_ERROR"
            
            if msg, ok := errorData["message"].(string); ok {
                message = msg
            }
            if c, ok := errorData["code"].(string); ok {
                code = c
            }

            apiErr := &ApiError{
                Message: message,
                Status:  resp.StatusCode,
                Code:    code,
                Details: errorData,
            }

            if resp.StatusCode >= 500 && attempt < c.config.Retries {
                time.Sleep(c.config.RetryDelay * time.Duration(attempt+1))
                continue
            }

            return nil, apiErr
        }

        var data interface{}
        if len(responseBody) > 0 {
            json.Unmarshal(responseBody, &data)
        }

        return &ApiResponse{
            Data:    data,
            Status:  resp.StatusCode,
            Headers: headers,
            Success: resp.StatusCode >= 200 && resp.StatusCode < 300,
        }, nil
    }

    return nil, fmt.Errorf("request failed after %d attempts: %w", c.config.Retries+1, lastErr)
}

func (c *ApiClient) Get(endpoint string) (*ApiResponse, error) {
    return c.makeRequest("GET", endpoint, nil)
}

func (c *ApiClient) Post(endpoint string, body interface{}) (*ApiResponse, error) {
    return c.makeRequest("POST", endpoint, body)
}

func (c *ApiClient) Put(endpoint string, body interface{}) (*ApiResponse, error) {
    return c.makeRequest("PUT", endpoint, body)
}

func (c *ApiClient) Patch(endpoint string, body interface{}) (*ApiResponse, error) {
    return c.makeRequest("PATCH", endpoint, body)
}

func (c *ApiClient) Delete(endpoint string) (*ApiResponse, error) {
    return c.makeRequest("DELETE", endpoint, nil)
}

func (c *ApiClient) SetApiKey(apiKey string) {
    c.config.ApiKey = apiKey
}

func (c *ApiClient) SetBaseURL(baseURL string) {
    c.config.BaseURL = baseURL
}