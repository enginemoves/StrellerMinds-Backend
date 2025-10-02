import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ReleaseService } from './release.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { PromoteReleaseDto } from './dto/promote-release.dto';
import { Env } from './entities/environment.enum';

@Controller('releases')
export class ReleaseController {
  constructor(private readonly service: ReleaseService) {}

  @Post()
  async create(@Body() dto: CreateReleaseDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll(@Query('env') env?: Env) {
    // optional filter by environment (latest only)
    if (env) {
      const r = await this.service.latestForEnvironment(env);
      return r ? [r] : [];
    }
    return this.service.findAll();
  }

  @Get(':idOrSemver')
  async findOne(@Param('idOrSemver') idOrSemver: string) {
    return this.service.findOne(idOrSemver);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateReleaseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':semver/promote')
  async promote(@Param('semver') semver: string, @Body() dto: PromoteReleaseDto) {
    return this.service.promote(semver, dto);
  }

  @Post('rollback')
  async rollback(@Body() body: { environment: Env; semver: string; triggeredBy?: string }) {
    if (!body.environment || !body.semver) {
      throw new NotFoundException('environment and semver required');
    }
    return this.service.rollback(body.environment, body.semver, body.triggeredBy);
  }

  @Get('env/:env/deployments')
  async deploymentsForEnv(@Param('env') env: Env) {
    return this.service.deploymentsForEnvironment(env);
  }
}
