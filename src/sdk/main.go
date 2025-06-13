// examples/go/main.go
package main

import (
    "fmt"
    "log"
    "time"
    
    nestjs "your-org/nestjs-api-sdk"
)

func main() {
    // Initialize SDK
    client := nestjs.NewApiClient(nestjs.ApiClientConfig{
        BaseURL:    "https://api.yourapp.com",
        ApiKey:     "your-api-key",
        Timeout:    30 * time.Second,
        Retries:    3,
        RetryDelay: time.Second,
        Debug:      true,
    })

    // Create users resource
    users := nestjs.NewUsersResource(client)

    // List users
    usersList, err := users.List(map[string]interface{}{
        "page":  1,
        "limit": 10,
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Users:", usersList.Data)

    // Create a user
    newUser, err := users.Create(map[string]interface{}{
        "name":     "John Doe",
        "email":    "john@example.com",
        "password": "securepassword",
    })
    if err != nil {
        if apiErr, ok := err.(*nestjs.ApiError); ok {
            fmt.Printf("API Error %d: %s\n", apiErr.Status, apiErr.Message)
            fmt.Printf("Error code: %s\n", apiErr.Code)
        } else {
            log.Fatal(err)
        }
        return
    }
    fmt.Println("Created user:", newUser.Data)

    // Custom request
    customData, err := client.Get("/custom-endpoint")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Custom data:", customData.Data)
}