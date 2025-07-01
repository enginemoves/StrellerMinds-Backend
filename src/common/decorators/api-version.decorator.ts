import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'apiVersion';
export const ApiVersion = (version: string) => SetMetadata(API_VERSION_KEY, version);

export const DEPRECATED_KEY = 'deprecated';
export const Deprecated = (deprecatedIn: string, removedIn: string, migrationGuide?: string) =>
  SetMetadata(DEPRECATED_KEY, { deprecatedIn, removedIn, migrationGuide });

