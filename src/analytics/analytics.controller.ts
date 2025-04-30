// src/analytics/analytics.controller.ts
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { ExportAnalyticsDto } from './dto/export-analytics.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('export')
  async exportAnalyticsData(
    @Query() query: ExportAnalyticsDto,
    @Res() res: Response,
  ) {
    const data = await this.analyticsService.getAllAnalytics();

    if (query.format === 'csv') {
      const csvData = this.analyticsService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      return res.send(csvData);
    }

    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  }
}
