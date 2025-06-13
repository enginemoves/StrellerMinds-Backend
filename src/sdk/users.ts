// packages/typescript/src/resources/users.ts
import { ApiClient, ApiResponse } from '../client';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export class UsersResource {
  constructor(private client: ApiClient) {}

  async list(params?: { page?: number; limit?: number }): Promise<ApiResponse<User[]>> {
    return this.client.get('/users', { params });
  }

  async get(id: string): Promise<ApiResponse<User>> {
    return this.client.get(`/users/${id}`);
  }

  async create(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.client.post('/users', data);
  }

  async update(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> {
    return this.client.patch(`/users/${id}`, data);
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/users/${id}`);
  }
}