# Job Matching API

Production-ready TypeScript + Express.js + PostgreSQL API with Azure AD B2C authentication, pgvector semantic search, and event-driven architecture.

## Features

- ✅ **Azure AD B2C Authentication** (OIDC/OAuth2)
- ✅ **Semantic Search** using pgvector
- ✅ **RBAC** (Admin vs User roles)
- ✅ **Rate Limiting** (100 requests per 15 minutes)
- ✅ **Redis Caching** for improved performance
- ✅ **Feature Flags** for beta features
- ✅ **CSV Export Service** for reports
- ✅ **Azure Service Bus** for event-driven architecture
- ✅ **OpenTelemetry** monitoring
- ✅ **Security** (Helmet, CORS, input validation)
- ✅ **Unit Tests** with Jest
- ✅ **CI/CD** with GitHub Actions
- ✅ **Infrastructure as Code** with Terraform

## API Endpoint

### GET /api/search?skills=typescript,azure

Search for job listings matching the given skills using semantic search.

**Query Parameters:**
- `skills` (required): Comma-separated list of skills
- `location` (optional): Filter by location
- `salaryMin` (optional): Minimum salary
- `salaryMax` (optional): Maximum salary
- `limit` (optional): Max results (default: 10, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/search?skills=typescript,azure&limit=10" \
  -H "Authorization: Bearer <your-token>"
```

**Response:**
```json
{
  "jobListings": [
    {
      "id": "uuid",
      "title": "Senior TypeScript Developer",
      "description": "...",
      "skills": ["typescript", "azure", "node.js"],
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

### GET /api/search/export?skills=typescript,azure (Admin only)

Export search results as CSV.

## Prerequisites

- Node.js v18+ or v20+
- PostgreSQL v14+ with pgvector extension
- Redis (optional, for caching)
- Azure account (for Azure AD B2C, Service Bus)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Update `.env` with your configuration:
- Azure AD B2C credentials
- Database credentials
- Redis configuration
- Azure Service Bus connection string

### 3. Set Up Database

```bash
# Create database
createdb job_matching_db

# Run migrations
psql -U postgres -d job_matching_db -f migrations/001_initial_schema.sql
```

### 4. Build and Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Blue/Green deployment strategy
- OpenTelemetry monitoring setup
- Alerting and dashboards
- Terraform infrastructure deployment

## Project Structure

```
job-matching-api/
├── src/
│   ├── config/          # Configuration (database, redis, service bus)
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Auth, rate limiting
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities (telemetry)
│   └── __tests__/       # Unit tests
├── infrastructure/      # Terraform IaC
├── migrations/          # Database migrations
├── .github/workflows/   # CI/CD pipelines
└── README.md
```

## Security

- **Authentication**: Azure AD B2C (OIDC/OAuth2) with JWT fallback
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: express-validator
- **Security Headers**: Helmet.js
- **CORS**: Configurable origins

## Monitoring

- **OpenTelemetry**: Automatic instrumentation
- **Application Insights**: Azure integration
- **Health Check**: `/health` endpoint

## License

MIT

