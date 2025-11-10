# Deployment Guide

## Blue/Green Deployments

### Overview
Blue/Green deployment strategy ensures zero-downtime deployments by maintaining two identical production environments (blue and green). Only one environment serves traffic at a time.

### Implementation with Azure App Service

Azure App Service supports deployment slots, which we use for blue/green deployments:

1. **Production Slot (Blue)**: Currently serving live traffic
2. **Staging Slot (Green)**: Used for new deployments

### Deployment Process

```bash
# 1. Deploy to staging slot
az webapp deployment slot swap \
  --resource-group rg-job-matching-platform \
  --name job-matching-api \
  --slot staging \
  --target-slot production

# 2. Run smoke tests on staging
curl https://job-matching-api-staging.azurewebsites.net/health

# 3. Swap staging to production (if tests pass)
az webapp deployment slot swap \
  --resource-group rg-job-matching-platform \
  --name job-matching-api \
  --slot staging \
  --target-slot production
```

### GitHub Actions Integration

The CI/CD pipeline automatically:
1. Deploys to staging slot
2. Runs smoke tests
3. Swaps to production if tests pass

See `.github/workflows/ci-cd.yml` for details.

### Rollback Procedure

If issues are detected after swap:

```bash
# Immediately swap back
az webapp deployment slot swap \
  --resource-group rg-job-matching-platform \
  --name job-matching-api \
  --slot staging \
  --target-slot production
```

## OpenTelemetry-Based Monitoring

### Setup

1. **Install OpenTelemetry packages** (already in package.json):
   - `@opentelemetry/sdk-node`
   - `@opentelemetry/auto-instrumentations-node`
   - `@opentelemetry/exporter-otlp-http`

2. **Configure in `src/utils/telemetry.ts`**:
   - Exports traces to Application Insights
   - Auto-instruments Express, HTTP, PostgreSQL

3. **Environment Variables**:
   ```env
   OTEL_EXPORTER_OTLP_ENDPOINT=https://your-app-insights.in.applicationinsights.azure.com/
   OTEL_SERVICE_NAME=job-matching-api
   ```

### Instrumentation

The application automatically instruments:
- **HTTP requests/responses** (Express routes)
- **Database queries** (PostgreSQL)
- **External HTTP calls**
- **Custom spans** (can be added manually)

### Viewing Traces

1. Navigate to Azure Portal → Application Insights
2. Go to "Transaction search" or "Performance"
3. Filter by operation name (e.g., `GET /api/search`)

### Custom Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('job-matching-api');

// Create custom span
const span = tracer.startSpan('search-jobs');
try {
  // Your code here
  span.setAttribute('skills', skills.join(','));
  span.setAttribute('result-count', results.length);
} finally {
  span.end();
}
```

## Alerting and Dashboards

### Application Insights Alerts

#### 1. Error Rate Alert

```bash
az monitor metrics alert create \
  --name "High Error Rate" \
  --resource-group rg-job-matching-platform \
  --scopes /subscriptions/{subscription-id}/resourceGroups/rg-job-matching-platform/providers/Microsoft.Insights/components/job-matching-api-ai \
  --condition "avg requests/failed > 5" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group /subscriptions/{subscription-id}/resourceGroups/rg-job-matching-platform/providers/microsoft.insights/actionGroups/alert-group
```

#### 2. Response Time Alert

```bash
az monitor metrics alert create \
  --name "High Response Time" \
  --resource-group rg-job-matching-platform \
  --scopes /subscriptions/{subscription-id}/resourceGroups/rg-job-matching-platform/providers/Microsoft.Insights/components/job-matching-api-ai \
  --condition "avg requests/duration > 2000" \
  --window-size 5m \
  --evaluation-frequency 1m
```

#### 3. Availability Alert

```bash
az monitor metrics alert create \
  --name "Low Availability" \
  --resource-group rg-job-matching-platform \
  --scopes /subscriptions/{subscription-id}/resourceGroups/rg-job-matching-platform/providers/Microsoft.Insights/components/job-matching-api-ai \
  --condition "avg availabilityResults/availabilityPercentage < 99" \
  --window-size 5m
```

### Dashboard Configuration

#### Create Dashboard in Azure Portal

1. Navigate to Azure Portal → Dashboards
2. Create new dashboard: "Job Matching API Dashboard"
3. Add tiles:

**Key Metrics:**
- Request rate (requests/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- Availability (%)

**Database Metrics:**
- PostgreSQL connection count
- Query duration
- Active connections

**Cache Metrics:**
- Redis hit rate
- Cache size
- Memory usage

**Custom Queries:**
```kusto
// Search API performance
requests
| where name == "GET /api/search"
| summarize 
    avg(duration),
    percentile(duration, 95),
    count()
    by bin(timestamp, 5m)
```

```kusto
// Error breakdown
exceptions
| summarize count() by type, bin(timestamp, 1h)
| order by timestamp desc
```

### Alert Action Groups

Configure action groups to receive notifications:

```bash
az monitor action-group create \
  --name alert-group \
  --resource-group rg-job-matching-platform \
  --short-name job-api-alerts \
  --email-receivers name=devops email=devops@example.com
```

### Log Analytics Queries

Useful KQL queries for monitoring:

```kusto
// Top slowest requests
requests
| where timestamp > ago(1h)
| order by duration desc
| take 10
| project timestamp, name, duration, url
```

```kusto
// Search query patterns
requests
| where name == "GET /api/search"
| extend skills = tostring(customDimensions.skills)
| summarize count() by skills
| order by count_ desc
```

```kusto
// Database query performance
dependencies
| where type == "SQL"
| where name contains "job_listings"
| summarize avg(duration), count() by name
```

## Terraform Deployment

### Prerequisites

1. Azure CLI installed and logged in
2. Terraform installed (>= 1.0)
3. Service principal with contributor role

### Setup

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars << EOF
postgres_admin_login = "adminuser"
postgres_admin_password = "YourSecurePassword123!"
environment = "prod"
location = "East US"
EOF

# Plan deployment
terraform plan

# Apply infrastructure
terraform apply
```

### Outputs

After deployment, Terraform outputs:
- App Service URL
- Database host
- Redis host

Use these to configure your application.

## Monitoring Best Practices

1. **Set up alerts early**: Configure alerts before production deployment
2. **Monitor key metrics**: Response time, error rate, availability
3. **Use dashboards**: Create custom dashboards for quick visibility
4. **Set up log retention**: Configure appropriate retention periods
5. **Regular reviews**: Review metrics weekly to identify trends

## Troubleshooting

### High Error Rate
- Check Application Insights → Failures
- Review exception details
- Check database connectivity

### Slow Response Times
- Review slow query logs
- Check Redis cache hit rate
- Monitor database performance
- Review Application Insights → Performance

### Deployment Issues
- Check deployment logs in App Service
- Verify environment variables
- Test staging slot before swap

