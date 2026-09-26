import { Request, Response, NextFunction } from 'express';
import { certService } from './cert.service.js';
import { sendSuccess } from '../../utils/response.js';

export class CertificatesController {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await certService.generateCertificates(req.params.eventId, req.body.type);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await certService.verifyCertificate(req.params.code);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getMyCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const certs = await certService.getMyCertificates(req.user!.id);
      return sendSuccess(res, certs, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const certificatesController = new CertificatesController();
