// packages/typescript/src/index.ts
import { ApiClient, ApiClientConfig, ApiError, ApiResponse } from './client';
import { UsersResource } from './resources/users';

export class NestJSApiSDK {
  public readonly users: UsersResource;
  private client: ApiClient;

  constructor(config: ApiClientConfig) {
    this.client = new ApiClient(config);
    this.users = new UsersResource(this.client);
  }

  // Expose client methods for custom requests
  get<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    return this.client.get(url, config);
  }

  post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.client.post(url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.client.put(url, data, config);
  }

  patch<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.client.patch(url, data, config);
  }

  delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    return this.client.delete(url, config);
  }

  setApiKey(apiKey: string): void {
    this.client.setApiKey(apiKey);
  }

  setBaseURL(baseURL: string): void {
    this.client.setBaseURL(baseURL);
  }

  // Event handling
  on(event: string, listener: (...args: any[]) => void): void {
    this.client.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.client.off(event, listener);
  }
}

export { ApiError, ApiResponse, ApiClientConfig };
export default NestJSApiSDK;