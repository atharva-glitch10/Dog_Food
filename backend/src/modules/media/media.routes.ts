import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../../middleware/requireAuth.js';
import { sendSuccess, AppError } from '../../utils/response.js';
import { generateRandomToken } from '../../utils/crypto.js';
import { detectFileType } from './file-type.js';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// Files are buffered in memory so their real type can be checked from magic
// bytes before anything touches the disk. The client-supplied MIME type and
// file name are never trusted.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

const router = Router();

router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400, 'MISSING_FILE');
      }

      const detected = detectFileType(req.file.buffer);
      if (!detected) {
        throw new AppError(
          'Invalid file type. Only JPEG, PNG, WEBP, GIF, and PDF files are allowed.',
          400,
          'INVALID_FILE_TYPE'
        );
      }

      const filename = `${Date.now()}-${generateRandomToken(8)}.${detected.ext}`;
      await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), req.file.buffer, { flag: 'wx' });

      return sendSuccess(
        res,
        {
          url: `/uploads/${filename}`,
          filename,
          mimetype: detected.mime,
          size: req.file.size,
        },
        201
      );
    } catch (err) {
      next(err);
    }
  }
);

export default router;
