import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('export')
  async exportAnalyticsData(
    @Query('format') format: string, 
    @Res() res: Response
  ) {
    const data = await this.analyticsService.getAllAnalytics(); // Fetch data
    
    if (format === 'csv') {
      const csvData = this.analyticsService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      return res.send(csvData);
    }
    
    // Default: JSON export
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  }
}
