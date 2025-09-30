import { SetMetadata } from '@nestjs/common';
import { SpanKind } from '@opentelemetry/api';

export const TRACE_OPTIONS_KEY = 'trace_options';

export interface TraceOptions {
  name?: string;
  attributes?: Record<string, any>;
  kind?: SpanKind;
  includeArgs?: boolean;
  includeResult?: boolean;
}

/**
 * Decorator to automatically trace method execution
 */
export const Trace = (options: TraceOptions = {}) => {
  return SetMetadata(TRACE_OPTIONS_KEY, {
    name: options.name,
    attributes: options.attributes || {},
    kind: options.kind || SpanKind.INTERNAL,
    includeArgs: options.includeArgs !== false, // Default to true
    includeResult: options.includeResult !== false, // Default to true
  });
};

/**
 * Decorator for tracing external service calls
 */
export const TraceExternalService = (serviceName: string, operation?: string) => {
  return Trace({
    name: operation ? `${serviceName}.${operation}` : serviceName,
    attributes: {
      'service.type': 'external',
      'service.name': serviceName,
    },
    kind: SpanKind.CLIENT,
  });
};

/**
 * Decorator for tracing database operations
 */
export const TraceDatabase = (operation: string, table?: string) => {
  return Trace({
    name: `db.${operation}`,
    attributes: {
      'db.system': 'postgresql',
      'db.operation': operation,
      'db.sql.table': table,
    },
    kind: SpanKind.CLIENT,
  });
};

/**
 * Decorator for tracing message queue operations
 */
export const TraceQueue = (queueName: string, operation?: string) => {
  return Trace({
    name: operation ? `queue.${queueName}.${operation}` : `queue.${queueName}`,
    attributes: {
      'messaging.system': 'redis',
      'messaging.destination': queueName,
      'messaging.operation': operation,
    },
    kind: SpanKind.CLIENT,
  });
};

/**
 * Decorator for tracing blockchain operations
 */
export const TraceBlockchain = (blockchain: string, operation?: string) => {
  return Trace({
    name: operation ? `blockchain.${blockchain}.${operation}` : `blockchain.${blockchain}`,
    attributes: {
      'blockchain.name': blockchain,
      'blockchain.operation': operation,
    },
    kind: SpanKind.CLIENT,
  });
};

/**
 * Decorator for tracing file operations
 */
export const TraceFile = (operation: string, fileName?: string) => {
  return Trace({
    name: `file.${operation}`,
    attributes: {
      'file.operation': operation,
      'file.name': fileName,
    },
    kind: SpanKind.CLIENT,
  });
};
