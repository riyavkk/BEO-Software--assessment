import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SearchService } from '../services/searchService';
import { ExportService } from '../services/exportService';
import { SearchQuery } from '../types';
import { validationResult } from 'express-validator';
import { featureFlags } from '../config/featureFlags';

export class SearchController {
  constructor(
    private searchService: SearchService,
    private exportService: ExportService
  ) {}

  /**
   * GET /search?skills=typescript,azure
   */
  search = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const skillsParam = req.query.skills as string;
      const location = req.query.location as string | undefined;
      const salaryMin = req.query.salaryMin
        ? parseInt(req.query.salaryMin as string, 10)
        : undefined;
      const salaryMax = req.query.salaryMax
        ? parseInt(req.query.salaryMax as string, 10)
        : undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : 0;

      const skills = skillsParam
        ? skillsParam.split(',').map((s) => s.trim())
        : [];

      if (skills.length === 0) {
        res.status(400).json({ error: 'At least one skill is required' });
        return;
      }

      const searchQuery: SearchQuery = {
        skills,
        location,
        salaryMin,
        salaryMax,
        limit: Math.min(limit, 100), // Max 100 results
        offset,
      };

      const result = await this.searchService.searchJobs(searchQuery);

      res.json(result);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * GET /search/export?skills=typescript,azure&format=csv
   */
  exportSearch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!featureFlags.enableExportService) {
        res.status(403).json({ error: 'Export service is disabled' });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const skillsParam = req.query.skills as string;
      const location = req.query.location as string | undefined;
      const salaryMin = req.query.salaryMin
        ? parseInt(req.query.salaryMin as string, 10)
        : undefined;
      const salaryMax = req.query.salaryMax
        ? parseInt(req.query.salaryMax as string, 10)
        : undefined;

      const skills = skillsParam
        ? skillsParam.split(',').map((s) => s.trim())
        : [];

      if (skills.length === 0) {
        res.status(400).json({ error: 'At least one skill is required' });
        return;
      }

      const searchQuery: SearchQuery = {
        skills,
        location,
        salaryMin,
        salaryMax,
        limit: 1000, // Max export limit
        offset: 0,
      };

      const searchResult = await this.searchService.searchJobs(searchQuery);
      const csvContent = await this.exportService.exportToCSV(searchResult);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="job-search-${Date.now()}.csv"`
      );
      res.send(csvContent);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Failed to export search results' });
    }
  };
}

