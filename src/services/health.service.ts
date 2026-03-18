import mongoose from 'mongoose';
import os from 'os';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'connecting';
      responseTime?: number;
    };
    memory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
      external: number;
    };
    system: {
      platform: string;
      arch: string;
      cpus: number;
      loadAverage: number[];
      freeMemory: number;
      totalMemory: number;
    };
  };
}

class HealthService {
  async getStatus(): Promise<HealthStatus> {
    const dbStatus = await this.checkDatabase();
    const memUsage = process.memoryUsage();

    const overallStatus =
      dbStatus.status === 'connected' ? 'ok' :
      dbStatus.status === 'connecting' ? 'degraded' : 'down';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbStatus,
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          cpus: os.cpus().length,
          loadAverage: os.loadavg(),
          freeMemory: Math.round(os.freemem() / 1024 / 1024),
          totalMemory: Math.round(os.totalmem() / 1024 / 1024),
        },
      },
    };
  }

  getLiveness(): { status: string; timestamp: string } {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  async getReadiness(): Promise<{ status: string; database: string; timestamp: string }> {
    const dbReady = mongoose.connection.readyState === 1;
    return {
      status: dbReady ? 'ready' : 'not ready',
      database: dbReady ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<{ status: 'connected' | 'disconnected' | 'connecting'; responseTime?: number }> {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const stateStr = states[mongoose.connection.readyState] as string;

    if (stateStr !== 'connected') {
      return { status: stateStr as 'disconnected' | 'connecting' };
    }

    const start = Date.now();
    try {
      await mongoose.connection.db?.admin().ping();
      return { status: 'connected', responseTime: Date.now() - start };
    } catch {
      return { status: 'disconnected' };
    }
  }
}

export default new HealthService();