-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    azure_ad_object_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create job_seekers table
CREATE TABLE IF NOT EXISTS job_seekers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skills TEXT[] DEFAULT '{}',
    skills_embedding vector(1536), -- OpenAI ada-002 dimension
    experience INTEGER DEFAULT 0,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create job_listings table
CREATE TABLE IF NOT EXISTS job_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    skills TEXT[] DEFAULT '{}',
    skills_embedding vector(1536), -- OpenAI ada-002 dimension
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    salary_min INTEGER,
    salary_max INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_listings_skills ON job_listings USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings (location);
CREATE INDEX IF NOT EXISTS idx_job_listings_company ON job_listings (company);
CREATE INDEX IF NOT EXISTS idx_job_listings_created_at ON job_listings (created_at DESC);

-- Create index for vector similarity search (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_job_listings_skills_embedding ON job_listings 
    USING hnsw (skills_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_job_seekers_skills_embedding ON job_seekers 
    USING hnsw (skills_embedding vector_cosine_ops);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_listings_updated_at BEFORE UPDATE ON job_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_seekers_updated_at BEFORE UPDATE ON job_seekers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO users (id, email, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@example.com', 'admin'),
    ('22222222-2222-2222-2222-222222222222', 'user@example.com', 'user')
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_listings (id, title, description, skills, company, location, salary_min, salary_max) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Senior TypeScript Developer', 
     'We are looking for an experienced TypeScript developer with Azure cloud experience.', 
     ARRAY['typescript', 'azure', 'node.js', 'postgresql'], 
     'Tech Corp', 'Remote', 120000, 180000),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Azure Cloud Engineer', 
     'Join our team as an Azure Cloud Engineer specializing in infrastructure as code.', 
     ARRAY['azure', 'terraform', 'docker', 'kubernetes'], 
     'Cloud Solutions Inc', 'San Francisco, CA', 130000, 200000),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Full Stack Developer', 
     'Full stack developer needed with expertise in TypeScript, React, and Node.js.', 
     ARRAY['typescript', 'react', 'node.js', 'express'], 
     'StartupXYZ', 'New York, NY', 100000, 150000)
ON CONFLICT (id) DO NOTHING;



