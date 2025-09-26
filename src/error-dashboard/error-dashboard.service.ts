import { Injectable } from '@nestjs/common';
import { LoggerService } from '../common/logging/logger.service';
import { AlertingService } from '../common/alerting/alerting.service';

export interface ErrorSummary {
  totalErrors: number;
  errorRate: number;
  criticalErrors: number;
  topErrorTypes: Array<{
    errorCode: string;
    count: number;
    percentage: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ErrorTrend {
  timestamp: Date;
  totalCount: number;
  criticalCount: number;
  errorRate: number;
}

export interface TopError {
  errorCode: string;
  errorMessage: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedEndpoints: string[];
}

export interface ErrorDetails {
  correlationId: string;
  errorCode: string;
  errorMessage: string;
  statusCode: number;
  timestamp: Date;
  endpoint: string;
  method: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  stackTrace?: string;
  context: Record<string, any>;
}

export interface AlertHistoryItem {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

@Injectable()
export class ErrorDashboardService {
  // In a real implementation, this would be stored in a database
  // For this example, we'll use in-memory storage
  private errorLogs: any[] = [];
  private alertHistory: AlertHistoryItem[] = [];

  constructor(
    private readonly loggerService: LoggerService,
    private readonly alertingService: AlertingService,
  ) {}

  async getErrorSummary(timeRangeHours = 24, errorCode?: string): Promise<ErrorSummary> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeRangeHours * 60 * 60 * 1000);

    // Filter logs by time range and optionally by error code
    const filteredLogs = this.errorLogs.filter(log => {
      const logTime = new Date(log.timestamp);
      const inTimeRange = logTime >= startDate && logTime <= endDate;
      const matchesErrorCode = !errorCode || log.errorCode === errorCode;
      return inTimeRange && matchesErrorCode;
    });

    // Calculate statistics
    const totalErrors = filteredLogs.length;
    const criticalErrors = filteredLogs.filter(log => 
      log.severity === 'high' || log.severity === 'critical'
    ).length;
    
    // Calculate error rate (errors per hour)
    const errorRate = totalErrors / timeRangeHours;

    // Group by error code and calculate top errors
    const errorTypeCounts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      errorTypeCounts[log.errorCode] = (errorTypeCounts[log.errorCode] || 0) + 1;
    });

    const topErrorTypes = Object.entries(errorTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([errorCode, count]) => ({
        errorCode,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }));

    return {
      totalErrors,
      errorRate,
      criticalErrors,
      topErrorTypes,
      timeRange: {
        start: startDate,
        end: endDate
      }
    };
  }

  async getErrorTrends(timeRangeHours = 168, intervalHours = 1): Promise<ErrorTrend[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeRangeHours * 60 * 60 * 1000);
    
    const trends: ErrorTrend[] = [];
    
    // Create time intervals
    const intervals = Math.ceil(timeRangeHours / intervalHours);
    for (let i = 0; i < intervals; i++) {
      const intervalStart = new Date(startDate.getTime() + i * intervalHours * 60 * 60 * 1000);
      const intervalEnd = new Date(intervalStart.getTime() + intervalHours * 60 * 60 * 1000);
      
      // Filter logs for this interval
      const intervalLogs = this.errorLogs.filter(log => {
        const logTime = new Date(log.timestamp);
        return logTime >= intervalStart && logTime < intervalEnd;
      });
      
      const totalCount = intervalLogs.length;
      const criticalCount = intervalLogs.filter(log => 
        log.severity === 'high' || log.severity === 'critical'
      ).length;
      
      // Calculate error rate for this interval (errors per hour)
      const errorRate = totalCount / intervalHours;
      
      trends.push({
        timestamp: intervalStart,
        totalCount,
        criticalCount,
        errorRate
      });
    }
    
    return trends;
  }

  async getTopErrors(limit = 10, timeRangeHours = 24): Promise<TopError[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeRangeHours * 60 * 60 * 1000);
    
    // Filter logs by time range
    const filteredLogs = this.errorLogs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= startDate && logTime <= endDate;
    });
    
    // Group by error code and aggregate information
    const errorAggregations: Record<string, any> = {};
    
    filteredLogs.forEach(log => {
      if (!errorAggregations[log.errorCode]) {
        errorAggregations[log.errorCode] = {
          errorCode: log.errorCode,
          errorMessage: log.message,
          count: 0,
          firstOccurrence: new Date(log.timestamp),
          lastOccurrence: new Date(log.timestamp),
          affectedEndpoints: new Set<string>()
        };
      }
      
      const aggregation = errorAggregations[log.errorCode];
      aggregation.count++;
      
      if (new Date(log.timestamp) < aggregation.firstOccurrence) {
        aggregation.firstOccurrence = new Date(log.timestamp);
      }
      
      if (new Date(log.timestamp) > aggregation.lastOccurrence) {
        aggregation.lastOccurrence = new Date(log.timestamp);
      }
      
      if (log.endpoint) {
        aggregation.affectedEndpoints.add(log.endpoint);
      }
    });
    
    // Convert to array and sort by count
    const topErrors = Object.values(errorAggregations)
      .map(aggregation => ({
        errorCode: aggregation.errorCode,
        errorMessage: aggregation.errorMessage,
        count: aggregation.count,
        firstOccurrence: aggregation.firstOccurrence,
        lastOccurrence: aggregation.lastOccurrence,
        affectedEndpoints: Array.from(aggregation.affectedEndpoints) as string[]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return topErrors;
  }

  async getErrorDetails(correlationId: string): Promise<ErrorDetails | null> {
    const log = this.errorLogs.find(log => log.correlationId === correlationId);
    
    if (!log) {
      return null;
    }
    
    return {
      correlationId: log.correlationId,
      errorCode: log.errorCode,
      errorMessage: log.message,
      statusCode: log.statusCode,
      timestamp: new Date(log.timestamp),
      endpoint: log.endpoint,
      method: log.method,
      userId: log.userId,
      userAgent: log.userAgent,
      ip: log.ip,
      stackTrace: log.stackTrace,
      context: log.context || {}
    };
  }

  async getAlertHistory(timeRangeHours = 168, severity?: string): Promise<AlertHistoryItem[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeRangeHours * 60 * 60 * 1000);
    
    // Filter alerts by time range and optionally by severity
    let filteredAlerts = this.alertHistory.filter(alert => {
      const alertTime = new Date(alert.timestamp);
      const inTimeRange = alertTime >= startDate && alertTime <= endDate;
      const matchesSeverity = !severity || alert.severity === severity;
      return inTimeRange && matchesSeverity;
    });
    
    // Sort by timestamp (newest first)
    filteredAlerts = filteredAlerts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return filteredAlerts;
  }

  // Method to add error logs (would be called by the exception filter)
  addErrorLog(errorLog: any): void {
    this.errorLogs.push(errorLog);
    
    // Keep only recent logs (last 1000 errors)
    if (this.errorLogs.length > 1000) {
      this.errorLogs = this.errorLogs.slice(-1000);
    }
  }

  // Method to add alert history (would be called by the alerting service)
  addAlertHistory(alert: AlertHistoryItem): void {
    this.alertHistory.push(alert);
    
    // Keep only recent alerts (last 100 alerts)
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }
  }
}