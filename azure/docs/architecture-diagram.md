# Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │   Web     │  │  Mobile  │  │Postman/  │  │  Other   │          │
│  │  Client   │  │   App    │  │  cURL    │  │  Clients │          │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘        │
└────────┼──────────────┼──────────────┼──────────────┼─────────────┘
         │              │              │              │
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Azure Application Gateway                         │
│              (Load Balancing, WAF, SSL Termination)                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Azure App Service / AKS                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │         Express.js API (Node.js/TypeScript)                  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Middleware Layer                                       │  │  │
│  │  │  • Authentication (Azure AD B2C JWT)                   │  │  │
│  │  │  • Authorization (RBAC)                                  │  │  │
│  │  │  • Rate Limiting                                       │  │  │
│  │  │  • Request Validation                                  │  │  │
│  │  │  • Error Handling                                      │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Controllers                                           │  │  │
│  │  │  • SearchController                                    │  │  │
│  │  │  • HealthController                                    │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Services                                              │  │  │
│  │  │  • SearchService (pgvector semantic search)           │  │  │
│  │  │  • CacheService (Redis)                               │  │  │
│  │  │  • ExportService (CSV generation)                     │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────┬──────────────┬──────────────┬──────────────┬───────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ PostgreSQL   │ │   Redis      │ │ Azure Service │ │  Azure AD    │
│ (with        │ │   Cache      │ │     Bus       │ │     B2C      │
│  pgvector)   │ │              │ │               │ │              │
│              │ │              │ │               │ │              │
│ • Job        │ │ • Search     │ │ • Job Events  │ │ • User Auth  │
│   Listings   │ │   Results    │ │ • Profile     │ │ • JWT Tokens │
│ • Job        │ │ • Feature    │ │   Updates     │ │ • User Roles │
│   Seekers    │ │   Flags      │ │ • Export      │ │              │
│ • Users      │ │              │ │   Requests    │ │              │
│ • Vector     │ │              │ │               │ │              │
│   Embeddings │ │              │ │               │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Data Flow: Search Request

```
1. Client Request
   │
   ▼
2. Application Gateway
   │  • SSL Termination
   │  • Request Routing
   │
   ▼
3. Express API
   │  • Helmet (Security Headers)
   │  • CORS
   │
   ▼
4. Authentication Middleware
   │  • Verify JWT Token
   │  • Extract User Claims
   │
   ▼
5. Rate Limiting Middleware
   │  • Check Request Count
   │  • Return 429 if exceeded
   │
   ▼
6. Validation Middleware
   │  • Validate Query Parameters
   │  • Return 400 if invalid
   │
   ▼
7. Search Controller
   │  • Parse Query Parameters
   │  • Build Search Query
   │
   ▼
8. Search Service
   │  ├─ Check Redis Cache
   │  │    │
   │  │    ├─ Cache Hit ────────────┐
   │  │    │                        │
   │  │    └─ Cache Miss            │
   │  │                            │
   │  └─ Query PostgreSQL           │
   │       │                        │
   │       ├─ Text Search (skills array overlap)│
   │       │                        │
   │       └─ Semantic Search (pgvector similarity)│
   │                            │
   │                            │
   └────────────────────────────┘
                               │
                               ▼
9. Return Results
   │  • Format Response
   │  • Cache Results (Redis)
   │
   ▼
10. Client Response
```

## Authentication Flow (Azure AD B2C)

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Client  │                    │   API    │                    │Azure AD  │
│          │                    │          │                    │   B2C     │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  1. Request Token             │                               │
     │──────────────────────────────>│                               │
     │                               │                               │
     │                               │  2. Redirect to Login         │
     │                               │──────────────────────────────>│
     │                               │                               │
     │                               │  3. User Authenticates        │
     │                               │<──────────────────────────────│
     │                               │                               │
     │  4. Receive Authorization     │                               │
     │     Code                     │                               │
     │<──────────────────────────────│                               │
     │                               │                               │
     │  5. Exchange Code for Token   │                               │
     │──────────────────────────────>│                               │
     │                               │  6. Request Token             │
     │                               │──────────────────────────────>│
     │                               │                               │
     │                               │  7. Return JWT Token           │
     │                               │<──────────────────────────────│
     │  8. Receive JWT Token         │                               │
     │<──────────────────────────────│                               │
     │                               │                               │
     │  9. API Request with JWT      │                               │
     │──────────────────────────────>│                               │
     │                               │  10. Verify Token             │
     │                               │──────────────────────────────>│
     │                               │                               │
     │                               │  11. Token Valid               │
     │                               │<──────────────────────────────│
     │  12. API Response             │                               │
     │<──────────────────────────────│                               │
     │                               │                               │
```

## Deployment Architecture (Azure)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Azure Region                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Resource Group: rg-job-matching-platform       │  │
│  │                                                              │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │  │
│  │  │ App Service    │  │  App Service   │  │ App Service │  │  │
│  │  │ (Production)   │  │  (Staging)     │  │ (Dev)       │  │  │
│  │  │                │  │                │  │             │  │  │
│  │  │ [Blue/Green]   │  │  [Testing]     │  │ [Dev]       │  │  │
│  │  └────────┬───────┘  └────────┬───────┘  └──────┬──────┘  │  │
│  │           │                   │                  │         │  │
│  │           └───────────────────┴──────────────────┘         │  │
│  │                              │                              │  │
│  │                              ▼                              │  │
│  │                   ┌──────────────────┐                      │  │
│  │                   │ Application      │                      │  │
│  │                   │ Gateway         │                      │  │
│  │                   └────────┬─────────┘                      │  │
│  │                            │                                 │  │
│  │  ┌─────────────┐  ┌────────▼─────────┐  ┌──────────────┐   │  │
│  │  │ PostgreSQL  │  │     Redis       │  │ Service Bus  │   │  │
│  │  │ Flexible    │  │     Cache       │  │              │   │  │
│  │  │ Server      │  │                 │  │              │   │  │
│  │  │             │  │                 │  │              │   │  │
│  │  │ • pgvector  │  │ • Standard Tier │  │ • Queues     │   │  │
│  │  │ • Read      │  │ • Geo-redundant │  │ • Topics     │   │  │
│  │  │   Replicas  │  │                 │  │              │   │  │
│  │  └─────────────┘  └─────────────────┘  └──────────────┘   │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              Application Insights                      │  │  │
│  │  │  • Metrics  • Logs  • Traces  • Alerts               │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │                    Key Vault                          │  │  │
│  │  │  • Secrets  • Certificates  • Connection Strings     │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Azure AD B2C (External)                        │  │
│  │  • User Authentication  • User Management                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## CI/CD Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GitHub Repository                                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            Push to develop            Push to main
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐      ┌───────────────────┐
        │   CI Pipeline     │      │   CI Pipeline     │
        │   (develop)       │      │   (main)          │
        └─────────┬─────────┘      └─────────┬─────────┘
                  │                          │
                  ▼                          ▼
        ┌───────────────────┐      ┌───────────────────┐
        │ 1. Lint Code      │      │ 1. Lint Code      │
        │ 2. Run Tests      │      │ 2. Run Tests      │
        │ 3. Security Scan  │      │ 3. Security Scan  │
        │ 4. Build          │      │ 4. Build          │
        └─────────┬─────────┘      └─────────┬─────────┘
                  │                          │
                  ▼                          ▼
        ┌───────────────────┐      ┌───────────────────┐
        │ Build Docker Image│      │ Build Docker Image│
        └─────────┬─────────┘      └─────────┬─────────┘
                  │                          │
                  ▼                          ▼
        ┌───────────────────┐      ┌───────────────────┐
        │ Deploy to Dev     │      │ Manual Approval   │
        │ (Auto)            │      │ Required          │
        └───────────────────┘      └─────────┬─────────┘
                                             │
                                             ▼
                                    ┌───────────────────┐
                                    │ Deploy to Staging │
                                    │ (Blue Slot)       │
                                    └─────────┬─────────┘
                                             │
                                             ▼
                                    ┌───────────────────┐
                                    │ Run Smoke Tests   │
                                    └─────────┬─────────┘
                                             │
                                             ▼
                                    ┌───────────────────┐
                                    │ Swap to Production│
                                    │ (Green → Blue)    │
                                    └─────────┬─────────┘
                                             │
                                             ▼
                                    ┌───────────────────┐
                                    │ Health Check     │
                                    │ Monitor Metrics  │
                                    └───────────────────┘
```

## Component Interaction Sequence

```
User Request → API Gateway → App Service
                                    │
                                    ├─→ Authentication → Azure AD B2C
                                    │
                                    ├─→ Search Controller
                                    │       │
                                    │       ├─→ Check Redis Cache
                                    │       │   └─→ [Hit] Return Cached
                                    │       │   └─→ [Miss] Continue
                                    │       │
                                    │       └─→ Search Service
                                    │               │
                                    │               ├─→ PostgreSQL
                                    │               │   ├─→ Text Search
                                    │               │   └─→ Vector Search
                                    │               │
                                    │               └─→ Cache Results (Redis)
                                    │
                                    └─→ Return Response
```


