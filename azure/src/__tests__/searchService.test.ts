import { Pool } from 'pg';
import { SearchService } from '../services/searchService';
import { SearchQuery } from '../types';

// Mock the database pool
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('SearchService', () => {
  let searchService: SearchService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = require('../config/database').pool as jest.Mocked<Pool>;
    searchService = new SearchService(mockPool);
    jest.clearAllMocks();
  });

  describe('searchJobs', () => {
    it('should return search results for matching skills', async () => {
      const mockCountResult = {
        rows: [{ total: '2' }],
      };

      const mockSearchResult = {
        rows: [
          {
            id: '1',
            title: 'TypeScript Developer',
            description: 'TypeScript job',
            skills: ['typescript', 'azure'],
            company: 'Tech Corp',
            location: 'Remote',
            salary_min: 120000,
            salary_max: 180000,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: '2',
            title: 'Azure Engineer',
            description: 'Azure job',
            skills: ['azure', 'typescript'],
            company: 'Cloud Inc',
            location: 'SF',
            salary_min: 130000,
            salary_max: 200000,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockSearchResult);

      const query: SearchQuery = {
        skills: ['typescript', 'azure'],
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchJobs(query);

      expect(result.total).toBe(2);
      expect(result.jobListings).toHaveLength(2);
      expect(result.jobListings[0].title).toBe('TypeScript Developer');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle empty results', async () => {
      const mockCountResult = {
        rows: [{ total: '0' }],
      };

      const mockSearchResult = {
        rows: [],
      };

      mockPool.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockSearchResult);

      const query: SearchQuery = {
        skills: ['nonexistent'],
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchJobs(query);

      expect(result.total).toBe(0);
      expect(result.jobListings).toHaveLength(0);
    });

    it('should filter by location when provided', async () => {
      const mockCountResult = {
        rows: [{ total: '1' }],
      };

      const mockSearchResult = {
        rows: [
          {
            id: '1',
            title: 'TypeScript Developer',
            description: 'TypeScript job',
            skills: ['typescript'],
            company: 'Tech Corp',
            location: 'San Francisco, CA',
            salary_min: null,
            salary_max: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockSearchResult);

      const query: SearchQuery = {
        skills: ['typescript'],
        location: 'San Francisco',
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchJobs(query);

      expect(result.total).toBe(1);
      expect(result.jobListings[0].location).toContain('San Francisco');
    });
  });
});



