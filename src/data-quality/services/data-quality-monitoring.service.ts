import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { Cron, CronExpression } from "@nestjs/schedule"

import type { DataQualityMetric } from "../entities/data-quality-metric.entity"
import type { DataQualityIssue } from "../entities/data-quality-issue.entity"

export interface QualityDashboard {
  overallScore: number
  categoryScores: Record<string, number>
  trendData: Array<{
    date: string
    score: number
    category: string
  }>
  activeIssues: number
  criticalIssues: number
  recentIssues: DataQualityIssue[]
}

@Injectable()
export class DataQualityMonitoringService {
  private readonly logger = new Logger(DataQualityMonitoringService.name)

  constructor(
    private readonly metricRepository: Repository<DataQualityMetric>,
    private readonly issueRepository: Repository<DataQualityIssue>,
  ) {}

  async getDashboard(entityType?: string): Promise<QualityDashboard> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // Last 30 days

    // Get overall score
    const overallScore = await this.calculateOverallScore(entityType, startDate, endDate)

    // Get category scores
    const categoryScores = await this.calculateCategoryScores(entityType, startDate, endDate)

    // Get trend data
    const trendData = await this.getTrendData(entityType, startDate, endDate)

    // Get issue counts
    const activeIssues = await this.issueRepository.count({
      where: {
        status: "open",
        ...(entityType && { entityType }),
      },
    })

    const criticalIssues = await this.issueRepository.count({
      where: {
        status: "open",
        priority: "critical",
        ...(entityType && { entityType }),
      },
    })

    // Get recent issues
    const recentIssues = await this.issueRepository.find({
      where: {
        ...(entityType && { entityType }),
      },
      order: { createdAt: "DESC" },
      take: 10,
    })

    return {
      overallScore,
      categoryScores,
      trendData,
      activeIssues,
      criticalIssues,
      recentIssues,
    }
  }

  private async calculateOverallScore(entityType?: string, startDate?: Date, endDate?: Date): Promise<number> {
    const query = this.metricRepository.createQueryBuilder("metric").select("AVG(metric.value)", "avgScore")

    if (entityType) {
      query.andWhere("metric.entityType = :entityType", { entityType })
    }

    if (startDate) {
      query.andWhere("metric.timestamp >= :startDate", { startDate })
    }

    if (endDate) {
      query.andWhere("metric.timestamp <= :endDate", { endDate })
    }

    const result = await query.getRawOne()
    return Number.parseFloat(result.avgScore) || 0
  }

  private async calculateCategoryScores(
    entityType?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<string, number>> {
    const query = this.metricRepository
      .createQueryBuilder("metric")
      .select("metric.metricCategory", "category")
      .addSelect("AVG(metric.value)", "avgScore")
      .groupBy("metric.metricCategory")

    if (entityType) {
      query.andWhere("metric.entityType = :entityType", { entityType })
    }

    if (startDate) {
      query.andWhere("metric.timestamp >= :startDate", { startDate })
    }

    if (endDate) {
      query.andWhere("metric.timestamp <= :endDate", { endDate })
    }

    const results = await query.getRawMany()
    const categoryScores: Record<string, number> = {}

    for (const result of results) {
      categoryScores[result.category] = Number.parseFloat(result.avgScore) || 0
    }

    return categoryScores
  }

  private async getTrendData(
    entityType?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    Array<{
      date: string
      score: number
      category: string
    }>
  > {
    const query = this.metricRepository
      .createQueryBuilder("metric")
      .select("DATE(metric.timestamp)", "date")
      .addSelect("metric.metricCategory", "category")
      .addSelect("AVG(metric.value)", "score")
      .groupBy("DATE(metric.timestamp), metric.metricCategory")
      .orderBy("DATE(metric.timestamp)", "ASC")

    if (entityType) {
      query.andWhere("metric.entityType = :entityType", { entityType })
    }

    if (startDate) {
      query.andWhere("metric.timestamp >= :startDate", { startDate })
    }

    if (endDate) {
      query.andWhere("metric.timestamp <= :endDate", { endDate })
    }

    const results = await query.getRawMany()
    return results.map((result) => ({
      date: result.date,
      score: Number.parseFloat(result.score) || 0,
      category: result.category,
    }))
  }

  async getMetricHistory(
    metricName: string,
    entityType?: string,
    days = 30,
  ): Promise<
    Array<{
      timestamp: Date
      value: number
      passed: boolean
    }>
  > {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const query = this.metricRepository
      .createQueryBuilder("metric")
      .where("metric.metricName = :metricName", { metricName })
      .andWhere("metric.timestamp >= :startDate", { startDate })

    if (entityType) {
      query.andWhere("metric.entityType = :entityType", { entityType })
    }

    const metrics = await query.orderBy("metric.timestamp", "ASC").getMany()

    return metrics.map((metric) => ({
      timestamp: metric.timestamp,
      value: Number.parseFloat(metric.value.toString()),
      passed: metric.passed,
    }))
  }

  @Cron(CronExpression.EVERY_HOUR)
  async monitorQualityThresholds(): Promise<void> {
    this.logger.log("Starting quality threshold monitoring")

    try {
      const recentMetrics = await this.metricRepository.find({
        where: {
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      })

      for (const metric of recentMetrics) {
        if (metric.threshold && metric.value < metric.threshold) {
          this.logger.warn(
            `Quality threshold breach: ${metric.metricName} = ${metric.value} (threshold: ${metric.threshold})`,
          )
          // Could trigger alerts here
        }
      }
    } catch (error) {
      this.logger.error(`Quality monitoring failed: ${error.message}`, error.stack)
    }
  }

  async getQualityAlerts(entityType?: string): Promise<
    Array<{
      id: string
      type: string
      severity: string
      message: string
      timestamp: Date
      entityType: string
    }>
  > {
    const alerts: Array<{
      id: string
      type: string
      severity: string
      message: string
      timestamp: Date
      entityType: string
    }> = []

    // Get critical issues as alerts
    const criticalIssues = await this.issueRepository.find({
      where: {
        status: "open",
        priority: "critical",
        ...(entityType && { entityType }),
      },
      order: { createdAt: "DESC" },
      take: 50,
    })

    for (const issue of criticalIssues) {
      alerts.push({
        id: issue.id,
        type: "quality_issue",
        severity: issue.priority,
        message: issue.description,
        timestamp: issue.createdAt,
        entityType: issue.entityType,
      })
    }

    // Get threshold breaches
    const thresholdBreaches = await this.metricRepository.find({
      where: {
        passed: false,
        ...(entityType && { entityType }),
      },
      order: { timestamp: "DESC" },
      take: 50,
    })

    for (const breach of thresholdBreaches) {
      alerts.push({
        id: breach.id,
        type: "threshold_breach",
        severity: "high",
        message: `${breach.metricName} failed threshold: ${breach.value} < ${breach.threshold}`,
        timestamp: breach.timestamp,
        entityType: breach.entityType,
      })
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
}
