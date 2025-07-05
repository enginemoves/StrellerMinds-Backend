import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class VersionHeaderMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const version = req.headers['api-version'] || 
                   req.headers['accept-version'] || 
                   req.query.version || 
                   'v1';
    
    req.headers['api-version'] = version as string;
    res.setHeader('API-Version', version);
    res.setHeader('Supported-Versions', 'v1, v2');
    
    next();
  }
}
