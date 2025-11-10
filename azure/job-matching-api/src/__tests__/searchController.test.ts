import { Request, Response } from 'express';
import { SearchController } from '../controllers/searchController';
import { SearchService } from '../services/searchService';
import { ExportService } from '../services/exportService';
import { UserRole } from '../types';

// Mock dependencies
jest.mock('../services/searchService');
jest.mock('../services/exportService');
jest.mock('../config/featureFlags', () => ({
  featureFlags: {
    enableRedisCache: false,
    enableBetaFeatures: false,
    enableExportService: true,
  },
}));

describe('SearchController', () => {
  let searchController: SearchController;
  let mockSearchService: jest.Mocked<SearchService>;
  let mockExportService: jest.Mocked<ExportService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockSearchService = {
      searchJobs: jest.fn(),
    } as any;

    mockExportService = {
      exportToCSV: jest.fn(),
    } as any;

    searchController = new SearchController(
      mockSearchService,
      mockExportService
    );

    mockRequest = {
      query: {
        skills: 'typescript,azure',
      },
      user: {
        id: '123',
        email: 'test@example.com',
        role: UserRole.USER,
      },
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should return search results', async () => {
      const mockResult = {
        jobListings: [],
        total: 0,
        limit: 10,
        offset: 0,
      };

      mockSearchService.searchJobs.mockResolvedValue(mockResult);

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockSearchService.searchJobs).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 if skills are missing', async () => {
      mockRequest.query = {};

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('exportSearch', () => {
    it('should export search results as CSV', async () => {
      const mockSearchResult = {
        jobListings: [
          {
            id: '123',
            title: 'Test Job',
            company: 'Test Corp',
            location: 'Remote',
            skills: ['typescript'],
            salaryMin: 100000,
            salaryMax: 150000,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
      };

      const mockCsv = 'ID,Title,Company\n123,Test Job,Test Corp';

      mockSearchService.searchJobs.mockResolvedValue(mockSearchResult);
      mockExportService.exportToCSV.mockResolvedValue(mockCsv);

      await searchController.exportSearch(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockSearchService.searchJobs).toHaveBeenCalled();
      expect(mockExportService.exportToCSV).toHaveBeenCalledWith(
        mockSearchResult
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv'
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockCsv);
    });
  });
});

