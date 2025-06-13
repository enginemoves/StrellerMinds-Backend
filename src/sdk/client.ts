// packages/typescript/src/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';

export interface ApiClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  debug?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  success: boolean;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ApiClient extends EventEmitter {
  private httpClient: AxiosInstance;
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    super();
    
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      debug: false,
      ...config
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        if (this.config.debug) {
          console.log(`[API Client] ${config.method?.toUpperCase()} ${config.url}`);
        }
        this.emit('request', config);
        return config;
      },
      (error) => {
        this.emit('requestError', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        this.emit('response', response);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Retry logic
        if (error.response?.status >= 500 && originalRequest._retryCount < this.config.retries) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          
          await this.delay(this.config.retryDelay * originalRequest._retryCount);
          return this.httpClient(originalRequest);
        }

        const apiError = this.createApiError(error);
        this.emit('error', apiError);
        return Promise.reject(apiError);
      }
    );
  }

  private createApiError(error: any): ApiError {
    if (error.response) {
      return new ApiError(
        error.response.data?.message || 'API request failed',
        error.response.status,
        error.response.data?.code || 'UNKNOWN_ERROR',
        error.response.data
      );
    } else if (error.request) {
      return new ApiError('Network error', 0, 'NETWORK_ERROR');
    } else {
      return new ApiError(error.message, 0, 'CLIENT_ERROR');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.httpClient.get(url, config);
    return this.formatResponse(response);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.httpClient.post(url, data, config);
    return this.formatResponse(response);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.httpClient.put(url, data, config);
    return this.formatResponse(response);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.httpClient.patch(url, data, config);
    return this.formatResponse(response);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.httpClient.delete(url, config);
    return this.formatResponse(response);
  }

  private formatResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
      success: response.status >= 200 && response.status < 300
    };
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.httpClient.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }

  setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
    this.httpClient.defaults.baseURL = baseURL;
  }
}