import { Request, Response, NextFunction } from 'express';
import { csvExportService } from './csv.service.js';
import { bulkImportService } from './bulk-import.service.js';
import { sendSuccess, AppError } from '../../utils/response.js';

export class ExportsController {
  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId, resource } = req.params;
      let csvContent = '';
      let filename = `${resource}-${new Date().toISOString().slice(0, 10)}.csv`;

      switch (resource) {
        case 'participants':
          csvContent = await csvExportService.exportParticipants(eventId);
          break;
        case 'teams':
          csvContent = await csvExportService.exportTeams(eventId);
          break;
        case 'projects':
          csvContent = await csvExportService.exportProjects(eventId);
          break;
        case 'scores':
          csvContent = await csvExportService.exportScores(eventId);
          break;
        case 'results':
          csvContent = await csvExportService.exportResults(eventId);
          break;
        default:
          throw new AppError(`Unknown export resource '${resource}'.`, 400, 'INVALID_RESOURCE');
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  }

  async importBulk(req: Request, res: Response, next: NextFunction) {
    try {
      const dryRun = req.body?.dryRun === true || req.query.dryRun === 'true';
      const result = await bulkImportService.importUsers(req.body?.users ?? [], {
        dryRun,
        importerRole: req.user?.role,
      });
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const exportsController = new ExportsController();
