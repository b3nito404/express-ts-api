import { Request, Response, NextFunction } from 'express';
import healthService from '../services/health.service';
import { sendSuccess } from '../utils/apiResponse';

class HealthController {
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await healthService.getStatus();
      const httpStatus = status.status === 'ok' ? 200 : status.status === 'degraded' ? 207 : 503;
      res.status(httpStatus).json({ success: true, message: 'Health status', data: status });
    } catch (err) {
      next(err);
    }
  }

  getLiveness(req: Request, res: Response): void {
    const status = healthService.getLiveness();
    sendSuccess(res, status, 'Service is alive');
  }

  async getReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await healthService.getReadiness();
      const httpStatus = status.status === 'ready' ? 200 : 503;
      res.status(httpStatus).json({ success: status.status === 'ready', message: status.status, data: status });
    } catch (err) {
      next(err);
    }
  }
}

export default new HealthController();