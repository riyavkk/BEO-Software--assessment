# Job Matching Platform - Backend API

A comprehensive backend system for a job matching platform with Azure AD B2C authentication, semantic search using pgvector, and event-driven architecture.


## Features




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
