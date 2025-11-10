import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { SearchService } from '../services/searchService';
import { SearchQuery } from '../types';
import { featureFlags } from '../config/featureFlags';
import { ExportService } from '../services/exportService';


export class SearchController {
  constructor(private readonly searchService: SearchService,
    private readonly exportService: ExportService
  ) {}

  search = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      //validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        skills: skillsParam,
        location,
        salaryMin,
        salaryMax,
        limit = '10',
        offset = '0',
      } = req.query;

      const skills =
        typeof skillsParam === 'string'
          ? skillsParam.split(',').map(s => s.trim()).filter(Boolean)
          : [];

      if (skills.length === 0) {
        res.status(400).json({ error: 'At least one skill is required' });
        return;
      }

      const searchQuery: SearchQuery = {
        skills,
        location: location as string | undefined,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        salaryMax: salaryMax ? Number(salaryMax) : undefined,
        limit: Math.min(Number(limit), 100),
        offset: Number(offset),
      };

      const result = await this.searchService.searchJobs(searchQuery);

      // Send response
      res.status(200).json(result);
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

    const {
      skills: skillsParam,
      location,
      salaryMin,
      salaryMax,
    } = req.query;

    const skills =
      typeof skillsParam === 'string'
        ? skillsParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    if (skills.length === 0) {
      res.status(400).json({ error: 'At least one skill is required' });
      return;
    }

    const searchQuery: SearchQuery = {
      skills,
      location: location as string | undefined,
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      limit: 1000,
      offset: 0,
    };

    const searchResult = await this.searchService.searchJobs(searchQuery);
    const csvContent = await this.exportService.exportToCSV(searchResult);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="job-search-${Date.now()}.csv"`
    );

    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export search results' });
  }
};
}

