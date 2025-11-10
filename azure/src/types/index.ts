export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  azureAdObjectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobListing {
  id: string;
  title: string;
  description: string;
  skills: string[];
  skillsEmbedding?: number[];
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobSeeker {
  id: string;
  userId: string;
  skills: string[];
  skillsEmbedding?: number[];
  experience: number;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchQuery {
  skills: string[];
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  jobListings: JobListing[];
  total: number;
  limit: number;
  offset: number;
}



