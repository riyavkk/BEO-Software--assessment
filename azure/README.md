# Job Matching Platform - Backend API

A comprehensive backend system for a job matching platform with Azure AD B2C authentication, semantic search using pgvector, and event-driven architecture.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Features

### Core Features
- REST API with TypeScript and Express.js
- Azure AD B2C authentication (OIDC/OAuth2)
- Semantic search using PostgreSQL with pgvector
- Role-based access control (RBAC) - Admin vs User
- Rate limiting (100 requests per 15 minutes)
-  Redis caching for improved performance
- Feature flags for beta features
- Comprehensive error handling
- Health check endpoint


## Architecture

### High-Level Overview

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Express API    │
│  (TypeScript)   │
└────┬──────┬─────┘
     │      │
     ▼      ▼
┌─────────┐ ┌────────┐
│PostgreSQL│ │ Redis  │
│(pgvector)│ │ Cache  │
└─────────┘ └────────┘
```

## Prerequisites

- **Node.js**: v18.x or higher
- **PostgreSQL**: v14 or higher with pgvector extension
- **Redis**: v6 or higher (optional, for caching)
- **npm**: v8.x or higher
- **Azure Account**: For Azure AD B2C and Service Bus (if deploying to Azure)

### Local Development Setup

1. **Install PostgreSQL**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
  

2. **Install pgvector extension**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-14-pgvector
   
   # Or compile from source
   git clone --branch v0.1.8 https://github.com/pgvector/pgvector.git
   cd pgvector
   make
   sudo make install
   ```

3. **Install Redis** (optional):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
  ```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd azure
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database

Create a PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE job_matching_db;

# Connect to the database
\c job_matching_db

# Enable pgvector extension
CREATE EXTENSION vector;

# Exit psql
\q
```

### 4. Run Database Migrations

Execute the SQL migration script:

```bash
psql -U postgres -d job_matching_db -f migrations/001_initial_schema.sql
```

Or using the connection string:

```bash
psql postgresql://user:password@localhost:5432/job_matching_db -f migrations/001_initial_schema.sql
```

### 5. Configure Environment Variables

Copy the example environment file:

```bash
cp env.example .env
```

Edit `.env` and update the following:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_matching_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Secret (generate a strong secret)
JWT_SECRET=your-very-secure-jwt-secret-key

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_REDIS_CACHE=true

# Azure AD B2C (for production)
AZURE_AD_B2C_TENANT_ID=your-tenant-id
AZURE_AD_B2C_CLIENT_ID=your-client-id
AZURE_AD_B2C_CLIENT_SECRET=your-client-secret
AZURE_AD_B2C_AUTHORITY=https://your-tenant.b2clogin.com/your-tenant.onmicrosoft.com/B2C_1_SignUpSignIn
```

### 6. Build the Application

```bash
npm run build
```

### 7. Start the Server

**Development mode** (with auto-reload):

```bash
npm run dev
```

**Production mode**:

```bash
npm start
```

The API will be available at `http://localhost:3000`

## Environment Variables

See `env.example` for all available environment variables. Key variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `DB_HOST` | PostgreSQL host | Yes | localhost |
| `DB_PORT` | PostgreSQL port | No | 5432 |
| `DB_NAME` | Database name | Yes | job_matching_db |
| `DB_USER` | Database user | Yes | - |
| `DB_PASSWORD` | Database password | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `REDIS_HOST` | Redis host | No | localhost |
| `REDIS_PORT` | Redis port | No | 6379 |
| `ENABLE_REDIS_CACHE` | Enable Redis caching | No | false |
| `ENABLE_BETA_FEATURES` | Enable beta features | No | false |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No | 100 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | No | 900000 |

## API Documentation

### Base URL

- **Development**: `http://localhost:3000/api`

### Authentication

All API endpoints (except `/health`) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Health Check

```http
GET /health
```

Check the health status of the API and its dependencies.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

#### Search Jobs

```http
GET /api/search?skills=typescript,azure&location=San Francisco&limit=10&offset=0
```

Search for job listings by skills and optional filters.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `skills` | string | Yes | Comma-separated list of skills |
| `location` | string | No | Filter by location |
| `salaryMin` | integer | No | Minimum salary |
| `salaryMax` | integer | No | Maximum salary |
| `limit` | integer | No | Max results (max 100, default 10) |
| `offset` | integer | No | Pagination offset (default 0) |

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/search?skills=typescript,azure&limit=10" \
  -H "Authorization: Bearer <your-token>"
```

**Example Response**:
```json
{
  "jobListings": [
    {
      "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "title": "Senior TypeScript Developer",
      "description": "We are looking for an experienced TypeScript developer...",
      "skills": ["typescript", "azure", "node.js", "postgresql"],
      "company": "Tech Corp",
      "location": "Remote",
      "salaryMin": 120000,
      "salaryMax": 180000,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

**Error Responses**:

- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid token
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### OpenAPI Specification

Full API specification available in [openapi.yaml](openapi.yaml).

View interactive documentation:
- Import `openapi.yaml` into [Swagger Editor](https://editor.swagger.io/)
- Or use [Swagger UI](https://swagger.io/tools/swagger-ui/)


**Setup**:
1. Import the collection
2. Set `baseUrl` variable: `http://localhost:3000/api`
3. Obtain a JWT token and set the `token` variable
4. Run requests

## Testing

### Run Unit Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

```

## Deployment

### Docker Deployment

**Build Docker Image**:
```bash
docker build -t job-matching-api .
```

**Run Container**:
```bash
docker run -p 3000:3000 --env-file .env job-matching-api
```

### Azure App Service Deployment

See [docs/deployment.md](docs/deployment.md) for detailed deployment instructions.

**Quick Deploy**:
```bash
# Using Azure CLI
az webapp up \
  --name job-matching-api \
  --resource-group rg-job-matching-platform \
  --runtime "NODE:18-lts"
```

Deploy infrastructure using Terraform:

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply configuration
terraform apply
```

See [infrastructure/main.tf](infrastructure/main.tf) for infrastructure configuration.
### CI/CD

The project includes a GitHub Actions workflow for automated CI/CD:

- **CI**: Runs on every push and PR
  - Linting
  - Unit tests
  - Security scanning
  - Build verification

- **CD**: Automatically deploys on merge to main/develop
  - Development: Auto-deploy
  - Production: Manual approval + blue/green deployment

See [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) for workflow configuration.

## Project Structure

```
.
├── src/
│   ├── config/          # Configuration files (database, redis, etc.)
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware (auth, rate limiting)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   ├── __tests__/       # Unit tests
│   └── server.ts        # Application entry point
├── migrations/          # Database migration scripts
├── infrastructure/      # Terraform infrastructure code
├── docs/                # Documentation
├── .github/
│   └── workflows/       # GitHub Actions workflows
├── Dockerfile           # Docker configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── jest.config.js       # Jest test configuration
├── openapi.yaml         # OpenAPI specification
└── README.md           # This file
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Role-based access control (Admin vs User)
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Input Validation**: All inputs validated using express-validator
5. **SQL Injection Prevention**: Parameterized queries only
6. **Helmet.js**: Security headers configured
7. **CORS**: Configured for allowed origins only

## Observability

### Logging

- Structured JSON logging
- Log levels: ERROR, WARN, INFO, DEBUG
- Integration with Azure Application Insights



