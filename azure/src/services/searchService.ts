import { Pool } from 'pg';
import { JobListing, SearchQuery, SearchResult } from '../types';
import { getRedisClient } from '../config/redis';
import { featureFlags } from '../config/featureFlags';

export class SearchService {
  constructor(private pool: Pool) {}

  /**
   * Search job listings based on skills, location, and salary filters.
   */
  async searchJobs(query: SearchQuery): Promise<SearchResult> {
    const { skills, location, salaryMin, salaryMax, limit = 10, offset = 0 } = query;

    //Check cache if Redis is enabled
    if (featureFlags.enableRedisCache) {
      const cacheKey = this.generateCacheKey(query);
      const cached = await this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    let sql = `
      SELECT 
        id, title, description, skills, 
        company, location, salary_min, salary_max,
        created_at, updated_at
      FROM job_listings
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (skills && skills.length > 0) {
      sql += ` AND skills && $${paramIndex}::text[]`;
      params.push(skills);
      paramIndex++;
    }

    if (location) {
      sql += ` AND LOWER(location) LIKE LOWER($${paramIndex})`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (salaryMin) {
      sql += ` AND (salary_max >= $${paramIndex} OR salary_max IS NULL)`;
      params.push(salaryMin);
      paramIndex++;
    }

    if (salaryMax) {
      sql += ` AND (salary_min <= $${paramIndex} OR salary_min IS NULL)`;
      params.push(salaryMax);
      paramIndex++;
    }

    const countSql = `SELECT COUNT(*) AS total FROM (${sql}) AS filtered`;
    const countResult = await this.pool.query(countSql, params);
    const total = parseInt(countResult.rows[0].total, 10);

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool.query(sql, params);

    const jobListings: JobListing[] = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      skills: row.skills || [],
      company: row.company,
      location: row.location,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const searchResult: SearchResult = {
      jobListings,
      total,
      limit,
      offset,
    };

    if (featureFlags.enableRedisCache) {
      const cacheKey = this.generateCacheKey(query);
      await this.setCache(cacheKey, searchResult, 300);
    }

    return searchResult;
  }

  /**
   * Simple semantic search placeholder (pgvector-ready)
   */
  async semanticSearch(skills: string[]): Promise<JobListing[]> {
    // TODO: Replace with pgvector semantic search when embeddings are integrated
    const query: SearchQuery = { skills };
    const result = await this.searchJobs(query);
    return result.jobListings;
  }

 
  private generateCacheKey(query: SearchQuery): string {
    return `search:${JSON.stringify(query)}`;
  }


  private async getFromCache(key: string): Promise<SearchResult | null> {
    try {
      const client = await getRedisClient();
      if (!client) return null;

      const cached = await client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Store results in Redis cache
   */
  private async setCache(key: string, value: SearchResult, ttlSeconds: number): Promise<void> {
    try {
      const client = await getRedisClient();
      if (!client) return;

      await client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
}
