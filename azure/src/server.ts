import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import dotenv from 'dotenv';
import searchRoutes from './routes/searchRoutes';
import healthRoutes from './routes/healthRoutes';

// Load environment variables early
dotenv.config();

// Initialize OpenTelemetry if configured (optional)
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  try {
    require('./utils/telemetry');
  } catch (error) {
    console.warn('OpenTelemetry not available (optional):', error);
  }
}



const app: Express = express();
const PORT = process.env.PORT || 3000;


app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api', searchRoutes);
app.use('/', healthRoutes);


app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : undefined,
  });
});


app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API base: http://localhost:${PORT}/api`);
});

export default app;
