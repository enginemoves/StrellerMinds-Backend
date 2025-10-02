import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Release } from './entities/release.entity';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { Artifact } from './entities/artifact.entity';
import { Deployment, DeploymentStatus } from './entities/deployment.entity';
import { Env } from './entities/environment.enum';
import { PromoteReleaseDto } from './dto/promote-release.dto';

@Injectable()
export class ReleaseService {
  private readonly logger = new Logger(ReleaseService.name);

  constructor(
    @InjectRepository(Release)
    private readonly releaseRepo: Repository<Release>,
    @InjectRepository(Artifact)
    private readonly artifactRepo: Repository<Artifact>,
    @InjectRepository(Deployment)
    private readonly deploymentRepo: Repository<Deployment>,
  ) {}

  async create(createDto: CreateReleaseDto): Promise<Release> {
    // basic semver check - keep it minimal
    if (!/^\\d+\\.\\d+\\.\\d+(-.+)?$/.test(createDto.semver)) {
      throw new BadRequestException('semver must be a valid semantic version (x.y.z)');
    }

    const release = this.releaseRepo.create({
      semver: createDto.semver,
      releaseNotes: createDto.releaseNotes ?? null,
      changelogUrl: createDto.changelogUrl ?? null,
      isDraft: createDto.isDraft ?? false,
    });

    if (createDto.artifacts?.length) {
      release.artifacts = createDto.artifacts.map((a) => this.artifactRepo.create(a));
    }

    return this.releaseRepo.save(release);
  }

  async findAll(): Promise<Release[]> {
    return this.releaseRepo.find({
      relations: ['artifacts', 'deployments'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(idOrSemver: string): Promise<Release> {
    const where =
      idOrSemver.includes('-') || /^\d+\.\d+\.\d+/.test(idOrSemver)
        ? { semver: idOrSemver }
        : { id: idOrSemver };

    const release = await this.releaseRepo.findOne({
      where,
      relations: ['artifacts', 'deployments'],
    });
    if (!release) throw new NotFoundException('Release not found');
    return release;
  }

  async update(id: string, dto: UpdateReleaseDto): Promise<Release> {
    const release = await this.findOne(id);
    Object.assign(release, dto);
    return this.releaseRepo.save(release);
  }

  async remove(id: string): Promise<void> {
    const release = await this.findOne(id);
    await this.releaseRepo.remove(release);
  }

  async promote(semver: string, promoteDto: PromoteReleaseDto): Promise<Deployment> {
    const release = await this.findOne(semver);
    // create deployment record
    const deployment = this.deploymentRepo.create({
      release,
      environment: promoteDto.targetEnv,
      status: DeploymentStatus.PENDING,
      triggeredBy: promoteDto.triggeredBy ?? 'system',
      createdAt: new Date(),
    });

    const saved = await this.deploymentRepo.save(deployment);

    // NOTE: real deployment orchestration (k8s apply, cloud deploy) is external.
    // We simulate a promotion flow and leave hooks to call external deployers.

    // For example: queue a job, call external orchestration, update status.

    // For now, set to IN_PROGRESS then SUCCESS to simulate automatic success:
    saved.status = DeploymentStatus.IN_PROGRESS;
    saved.startedAt = new Date();
    await this.deploymentRepo.save(saved);

    // Simulate call to external system here -> if fails mark FAILED.
    // We'll mark success for this example:
    saved.status = DeploymentStatus.SUCCESS;
    saved.finishedAt = new Date();
    saved.logs = 'Promoted successfully (simulated)';
    await this.deploymentRepo.save(saved);

    this.logger.log(`Release ${release.semver} promoted to ${promoteDto.targetEnv}`);
    return saved;
  }

  async rollback(environment: Env, toSemver: string, triggeredBy?: string): Promise<Deployment> {
    // Create a deployment record representing rollback
    const release = await this.findOne(toSemver);
    if (!release) throw new NotFoundException('target release not found for rollback');
    const deployment = this.deploymentRepo.create({
      release,
      environment,
      status: DeploymentStatus.IN_PROGRESS,
      triggeredBy: triggeredBy ?? 'system',
    });
    const saved = await this.deploymentRepo.save(deployment);

    // External orchestration to rollback would be invoked here.
    saved.status = DeploymentStatus.ROLLED_BACK;
    saved.finishedAt = new Date();
    saved.logs = `Rolled back to ${toSemver} (simulated)`;
    await this.deploymentRepo.save(saved);

    return saved;
  }

  async latestForEnvironment(environment: Env): Promise<Release | null> {
    // find latest successful deployment for the environment and return its release
    const dep = await this.deploymentRepo.findOne({
      where: { environment, status: DeploymentStatus.SUCCESS },
      relations: ['release'],
      order: { createdAt: 'DESC' },
    });
    return dep ? dep.release : null;
  }

  // Add helper: find history for an environment
  async deploymentsForEnvironment(environment: Env) {
    return this.deploymentRepo.find({
      where: { environment },
      relations: ['release'],
      order: { createdAt: 'DESC' },
    });
  }
}
