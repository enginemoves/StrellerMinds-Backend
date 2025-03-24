/* eslint-disable prettier/prettier */
// Purpose: Test file for auth controller.
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { Injectable } from '@nestjs/common';
import { JwtStrategy } from '@nestjs/passport'; 

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // eslint-disable-next-line prettier/prettier
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

@Injectable()
export class JwtAuthStrategy extends JwtStrategy {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub };
  }
}
