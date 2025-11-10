import { SearchService } from '../services/searchService';
import { Pool } from 'pg';
import { SearchQuery } from '../types';

// Mock dependencies
jest.mock('../config/redis');
jest.mock('../config/azureServiceBus');
jest.mock('../config/featureFlags', () => ({
  featureFlags: {
    enableRedisCache: false,
    enableBetaFeatures: false,
    enableExportService: true,
  },
}));

describe('SearchService', () => {
  let searchService: SearchService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as any;

    searchService = new SearchService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchJobs', () => {
    it('should search jobs with skills', async () => {
      const query: SearchQuery = {
        skills: ['typescript', 'azure'],
        limit: 10,
        offset: 0,
      };

      const mockResults = {
        rows: [
          {
            id: '123',
            title: 'Senior TypeScript Developer',
            description: 'Test description',
            skills: ['typescript', 'azure'],
            company: 'Tech Corp',
            location: 'Remote',
            salary_min: 120000,
            salary_max: 180000,
            created_at: new Date(),
            updated_at: new Date(),
            similarity: 0.95,
          },
        ],
      };

      const mockCount = {
        rows: [{ total: '1' }],
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce(mockCount);

      const result = await searchService.searchJobs(query);

      expect(result.jobListings).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle empty results', async () => {
      const query: SearchQuery = {
        skills: ['typescript'],
        limit: 10,
        offset: 0,
      };

      const mockResults = { rows: [] };
      const mockCount = { rows: [{ total: '0' }] };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce(mockCount);

      const result = await searchService.searchJobs(query);

      expect(result.jobListings).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should apply location filter', async () => {
      const query: SearchQuery = {
        skills: ['typescript'],
        location: 'Remote',
        limit: 10,
        offset: 0,
      };

      const mockResults = { rows: [] };
      const mockCount = { rows: [{ total: '0' }] };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce(mockCount);

      await searchService.searchJobs(query);

      const searchQuery = (mockPool.query as jest.Mock).mock.calls[0][0];
      expect(searchQuery).toContain('location ILIKE');
    });

    it('should apply salary filters', async () => {
      const query: SearchQuery = {
        skills: ['typescript'],
        salaryMin: 100000,
        salaryMax: 200000,
        limit: 10,
        offset: 0,
      };

      const mockResults = { rows: [] };
      const mockCount = { rows: [{ total: '0' }] };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce(mockCount);

      await searchService.searchJobs(query);

      const searchQuery = (mockPool.query as jest.Mock).mock.calls[0][0];
      expect(searchQuery).toContain('salary_max');
      expect(searchQuery).toContain('salary_min');
    });
  });
});

