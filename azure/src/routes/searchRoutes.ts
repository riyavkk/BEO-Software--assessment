import { Router } from 'express';
import { query } from 'express-validator';
import { SearchController } from '../controllers/searchController';
import { SearchService } from '../services/searchService';
import { ExportService } from '../services/exportService';
import { authenticate, authorize } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { UserRole } from '../types';
import pool from '../config/database';

const router = Router();

const searchService = new SearchService(pool);
const exportService = new ExportService();
const searchController = new SearchController(searchService, exportService);

const searchValidation = [
  query('skills')
    .notEmpty()
    .withMessage('Skills parameter is required')
    .isString()
    .withMessage('Skills must be a comma-separated string'),
  query('location')
    .optional()
    .isString()
    .withMessage('Location must be a string'),
  query('salaryMin')
    .optional()
    .isInt({ min: 0 })
    .withMessage('salaryMin must be a positive integer'),
  query('salaryMax')
    .optional()
    .isInt({ min: 0 })
    .withMessage('salaryMax must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer'),
];

router.get(
  '/search',
  authenticate,
  rateLimiter,
  searchValidation,
  searchController.search.bind(searchController)
);

// GET  (Admin only)
router.get(
  '/search/export',
  authenticate,
  authorize(UserRole.ADMIN), 
  rateLimiter,
  searchValidation,
  searchController.exportSearch.bind(searchController)
);

export default router;
