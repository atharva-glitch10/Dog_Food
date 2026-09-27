import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import eventsRoutes from './modules/events/events.routes.js';
import tracksPrizesRoutes from './modules/tracks-prizes/tracks-prizes.routes.js';
import teamsRoutes from './modules/teams/teams.routes.js';
import submissionsRoutes from './modules/submissions/submissions.routes.js';
import galleryRoutes from './modules/gallery/gallery.routes.js';
import judgesRoutes from './modules/judges/judges.routes.js';
import assignmentsRoutes from './modules/assignments/assignments.routes.js';
import rubricsRoutes from './modules/rubrics/rubrics.routes.js';
import scoringRoutes from './modules/scoring/scoring.routes.js';
import normalizationRoutes from './modules/normalization/normalization.routes.js';
import resultsRoutes from './modules/results/results.routes.js';
import votingRoutes from './modules/voting/voting.routes.js';
import pairwiseRoutes from './modules/pairwise/pairwise.routes.js';
import exportsRoutes from './modules/exports/exports.routes.js';
import certificatesRoutes from './modules/certificates/certificates.routes.js';
import webhooksRoutes from './modules/webhooks/webhooks.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import mediaRoutes from './modules/media/media.routes.js';
import { INLINE_IMAGE_EXTENSIONS } from './modules/media/file-type.js';

export function createApp() {
  const app = express();

  // Behind the Nginx reverse proxy, req.ip must come from X-Forwarded-For so the
  // rate limiter, vote IP tracking and audit log see the real client address.
  if (config.trustProxy !== false) {
    app.set('trust proxy', config.trustProxy);
  }

  // Comma-separated CORS origins and optional CUSTOM_DOMAIN support
  const envOrigins = (config.corsOrigin || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const customDomain = process.env.CUSTOM_DOMAIN
    ? [`http://${process.env.CUSTOM_DOMAIN}`, `https://${process.env.CUSTOM_DOMAIN}`]
    : [];
  const allowedOrigins = Array.from(
    new Set([
      ...envOrigins,
      ...customDomain,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ])
  );

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // HTTP Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // HSTS must only be sent in production (over HTTPS). Sending it over HTTP in development
    // permanently breaks local access by caching an HTTPS-only directive in the browser.
    if (config.nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
      ].join('; ')
    );
    next();
  });

  app.use(cookieParser(config.cookieSecret));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static uploads serving
  const uploadsPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  // Uploaded files are user content: never let the browser sniff them into
  // HTML/JS, sandbox them, and force a download for anything that is not an
  // allowlisted raster image (e.g. PDFs, or legacy files from older versions).
  app.use(
    '/uploads',
    express.static(uploadsPath, {
      dotfiles: 'deny',
      index: false,
      setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
        if (!INLINE_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
          res.setHeader('Content-Disposition', 'attachment');
        }
      },
    })
  );

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'DOGFOOD 2026',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Swagger OpenAPI UI. The spec lives in backend/docs/openapi.yaml; resolve it
  // relative to this module (src/ in dev, dist/ in the Docker image) so it
  // does not depend on the process working directory.
  const swaggerPath = path.resolve(__dirname, '..', 'docs', 'openapi.yaml');
  const chosenPath = fs.existsSync(swaggerPath) ? swaggerPath : null;

  if (chosenPath) {
    try {
      const swaggerDoc = YAML.load(chosenPath);
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    } catch (err) {
      console.warn('Could not initialize Swagger UI from yaml file:', err);
    }
  }

  // Register API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api', tracksPrizesRoutes);
  app.use('/api', teamsRoutes);
  app.use('/api', submissionsRoutes);
  app.use('/api', galleryRoutes);
  app.use('/api', judgesRoutes);
  app.use('/api', assignmentsRoutes);
  app.use('/api', rubricsRoutes);
  app.use('/api', scoringRoutes);
  app.use('/api', normalizationRoutes);
  app.use('/api', resultsRoutes);
  app.use('/api', votingRoutes);
  app.use('/api', pairwiseRoutes);
  app.use('/api', exportsRoutes);
  app.use('/api', certificatesRoutes);
  app.use('/api', webhooksRoutes);
  app.use('/api', auditRoutes);
  app.use('/api', usersRoutes);
  app.use('/api/media', mediaRoutes);

  // Centralized error handling
  app.use(errorHandler);

  return app;
}
