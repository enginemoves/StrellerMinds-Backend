// src/auth/dto/auth-response.dto.ts

import { Role } from "src/role/roles.enum";

export class AuthResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    role: Role; // 👈 ADD this line
  };
}
