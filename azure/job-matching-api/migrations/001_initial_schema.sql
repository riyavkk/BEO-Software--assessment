-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    azure_ad_object_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create job_listings table with pgvector support
CREATE TABLE IF NOT EXISTS job_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    skills TEXT[] NOT NULL,
    skills_embedding vector(1536),
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    salary_min INTEGER,
    salary_max INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on skills_embedding for similarity search
CREATE INDEX IF NOT EXISTS job_listings_embedding_idx 
ON job_listings 
USING ivfflat (skills_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings(location);
CREATE INDEX IF NOT EXISTS idx_job_listings_company ON job_listings(company);
CREATE INDEX IF NOT EXISTS idx_job_listings_created_at ON job_listings(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_listings_updated_at
    BEFORE UPDATE ON job_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample job listings (for testing)
INSERT INTO job_listings (title, description, skills, company, location, salary_min, salary_max) VALUES
    (
        'Senior TypeScript Developer',
        'We are looking for an experienced TypeScript developer with Azure cloud experience.',
        ARRAY['typescript', 'azure', 'node.js', 'postgresql'],
        'Tech Corp',
        'Remote',
        120000,
        180000
    ),
    (
        'Full Stack Developer - Azure',
        'Join our team to build scalable applications using TypeScript and Azure services.',
        ARRAY['typescript', 'azure', 'react', 'postgresql'],
        'Cloud Solutions Inc',
        'San Francisco, CA',
        130000,
        200000
    )
ON CONFLICT DO NOTHING;

