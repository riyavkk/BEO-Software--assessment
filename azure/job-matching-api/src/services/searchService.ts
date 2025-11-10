import { Pool } from 'pg';
import { SearchQuery, SearchResult, JobListing } from '../types';
import { getRedisClient } from '../config/redis';
import { featureFlags } from '../config/featureFlags';
import { sendEvent } from '../config/azureServiceBus';

export class SearchService {
  constructor(private pool: Pool) {}

  /**
   * Generate embedding for skills (simplified - in production, use OpenAI/Cohere API)
   * This is a placeholder - replace with actual embedding generation
   */
  private async generateEmbedding(skills: string[]): Promise<number[]> {
    // Placeholder: In production, call embedding API (OpenAI, Cohere, etc.)
    // For now, return a simple hash-based vector
    const dimension = 1536; // OpenAI ada-002 dimension
    const embedding = new Array(dimension).fill(0);
    
    skills.forEach((skill, index) => {
      const hash = skill.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      embedding[index % dimension] = (embedding[index % dimension] + hash) % 1000 / 1000;
    });

    return embedding;
  }

  /**
   * Search jobs using pgvector semantic search
   */
  async searchJobs(query: SearchQuery): Promise<SearchResult> {
    const { skills, location, salaryMin, salaryMax, limit = 10, offset = 0 } = query;

    // Check cache if enabled
    if (featureFlags.enableRedisCache) {
      const cacheKey = `search:${JSON.stringify(query)}`;
      const redisClient = await getRedisClient();
      
      if (redisClient) {
        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            console.log('✅ Cache hit for search query');
            return JSON.parse(cached);
          }
        } catch (error) {
          console.warn('Redis cache read error:', error);
        }
      }
    }

    // Generate embedding for skills
    const skillsEmbedding = await this.generateEmbedding(skills);
    const embeddingString = `[${skillsEmbedding.join(',')}]`;

    // Build query with semantic search
    let sqlQuery = `
      SELECT 
        id, title, description, skills, company, location,
        salary_min, salary_max, created_at, updated_at,
        1 - (skills_embedding <=> $1::vector) as similarity
      FROM job_listings
      WHERE skills_embedding IS NOT NULL
    `;

    const params: any[] = [embeddingString];
    let paramIndex = 2;

    // Add filters
    if (location) {
      sqlQuery += ` AND location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (salaryMin !== undefined) {
      sqlQuery += ` AND (salary_max IS NULL OR salary_max >= $${paramIndex})`;
      params.push(salaryMin);
      paramIndex++;
    }

    if (salaryMax !== undefined) {
      sqlQuery += ` AND (salary_min IS NULL OR salary_min <= $${paramIndex})`;
      params.push(salaryMax);
      paramIndex++;
    }

    // Order by similarity and add pagination
    sqlQuery += ` ORDER BY similarity DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM job_listings
      WHERE skills_embedding IS NOT NULL
    `;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (location) {
      countQuery += ` AND location ILIKE $${countParamIndex}`;
      countParams.push(`%${location}%`);
      countParamIndex++;
    }

    if (salaryMin !== undefined) {
      countQuery += ` AND (salary_max IS NULL OR salary_max >= $${countParamIndex})`;
      countParams.push(salaryMin);
      countParamIndex++;
    }

    if (salaryMax !== undefined) {
      countQuery += ` AND (salary_min IS NULL OR salary_min <= $${countParamIndex})`;
      countParams.push(salaryMax);
      countParamIndex++;
    }

    try {
      const [results, countResult] = await Promise.all([
        this.pool.query(sqlQuery, params),
        this.pool.query(countQuery, countParams),
      ]);

      const jobListings: JobListing[] = results.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        skills: Array.isArray(row.skills) ? row.skills : JSON.parse(row.skills || '[]'),
        company: row.company,
        location: row.location,
        salaryMin: row.salary_min,
        salaryMax: row.salary_max,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const total = parseInt(countResult.rows[0].total, 10);

      const searchResult: SearchResult = {
        jobListings,
        total,
        limit,
        offset,
      };

      // Cache result if enabled
      if (featureFlags.enableRedisCache) {
        const redisClient = await getRedisClient();
        if (redisClient) {
          try {
            await redisClient.setEx(
              `search:${JSON.stringify(query)}`,
              300, // 5 minutes cache
              JSON.stringify(searchResult)
            );
          } catch (error) {
            console.warn('Redis cache write error:', error);
          }
        }
      }

      // Send event to Service Bus
      await sendEvent('job.search', {
        query,
        resultCount: jobListings.length,
        total,
      });

      return searchResult;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Failed to search jobs');
    }
  }
}

