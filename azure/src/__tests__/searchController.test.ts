import { Request, Response } from 'express';
import { SearchController } from '../controllers/searchController';
import { SearchService } from '../services/searchService';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';

// Mock the SearchService
jest.mock('../services/searchService');

describe('SearchController', () => {
  let searchController: SearchController;
  let mockSearchService: jest.Mocked<SearchService>;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockSearchService = {
      searchJobs: jest.fn(),
      semanticSearch: jest.fn(),
    } as any;

    searchController = new SearchController(mockSearchService);

    mockRequest = {
      query: {},
      user: {
        id: '123',
        email: 'test@example.com',
        role: UserRole.USER,
      },
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('search', () => {
    it('should return search results for valid query', async () => {
      const mockResult = {
        jobListings: [
          {
            id: '1',
            title: 'TypeScript Developer',
            description: 'Test',
            skills: ['typescript'],
            company: 'Tech Corp',
            location: 'Remote',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
      };

      mockRequest.query = {
        skills: 'typescript,azure',
      };

      mockSearchService.searchJobs.mockResolvedValue(mockResult);

      await searchController.search(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockSearchService.searchJobs).toHaveBeenCalledWith({
        skills: ['typescript', 'azure'],
        limit: 10,
        offset: 0,
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when skills are missing', async () => {
      mockRequest.query = {};

      await searchController.search(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'At least one skill is required',
      });
    });
  });
});



