# MAPIT Scalability & Infrastructure Guide

**Last Updated:** February 9, 2026  
**Current Version:** 1.0.8 (787d3d9a)  
**Author:** Development Team

---

## Table of Contents

1. [Current Architecture Overview](#current-architecture-overview)
2. [Database Scalability](#database-scalability)
3. [Server Performance](#server-performance)
4. [API Rate Limiting](#api-rate-limiting)
5. [Subscription Tier Limits](#subscription-tier-limits)
6. [File Upload & Storage](#file-upload--storage)
7. [Concurrent User Handling](#concurrent-user-handling)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Scaling Roadmap](#scaling-roadmap)
10. [Troubleshooting](#troubleshooting)

---

## Current Architecture Overview

### Technology Stack

| Component | Technology | Details |
|-----------|-----------|---------|
| **Frontend** | React 19 + Tailwind 4 | Client-side rendering with Vite |
| **Backend** | Express.js + tRPC 11 | Type-safe API layer |
| **Database** | MySQL (Manus Managed) | Normalized schema with proper indexing |
| **Storage** | S3 CDN | Public file storage with CDN distribution |
| **Hosting** | Manus Platform | Auto-scaling managed infrastructure |
| **Authentication** | Manus OAuth | Built-in user management |

### Current Limits (Manus Platform)

- **Database:** Shared MySQL instance (auto-scales)
- **Storage:** S3 bucket with unlimited capacity
- **Bandwidth:** CDN-based (pay-per-GB)
- **Concurrent Connections:** ~100-200 per instance
- **Request Timeout:** 30 seconds (API calls)

---

## Database Scalability

### Current Schema Overview

```
users (core auth table)
├── projects (user's drone mapping projects)
│   ├── media (photos/videos with GPS data)
│   ├── flights (drone flight sessions)
│   └── projectCollaborators (shared access)
├── clients (client portal users)
│   ├── clientUsers (portal user accounts)
│   └── clientInvitations (pending invites)
└── warrantyReminders (automated notifications)
```

### Table Size Projections

| Table | 100 Users | 1,000 Users | 10,000 Users | 100,000 Users |
|-------|-----------|------------|-------------|---------------|
| **users** | 100 rows | 1K rows | 10K rows | 100K rows |
| **projects** | 500 rows | 5K rows | 50K rows | 500K rows |
| **media** | 50K rows | 500K rows | 5M rows | 50M rows |
| **flights** | 1K rows | 10K rows | 100K rows | 1M rows |
| **clients** | 50 rows | 500 rows | 5K rows | 50K rows |

**Database Size Estimate:**
- 100 users: ~50 MB
- 1,000 users: ~500 MB
- 10,000 users: ~5 GB
- 100,000 users: ~50 GB

### Performance Bottlenecks & Solutions

#### 1. Media Table Growth (Highest Priority)

**Problem:** With millions of media rows, queries like "get all photos for project X" will slow down.

**Current Indexes:**
```sql
-- Recommended indexes (add if not present)
CREATE INDEX idx_media_projectId ON media(projectId);
CREATE INDEX idx_media_userId ON media(userId);
CREATE INDEX idx_media_flightId ON media(flightId);
CREATE INDEX idx_media_createdAt ON media(createdAt);
```

**Optimization Strategy:**
- **Phase 1 (0-1M rows):** Current setup handles fine
- **Phase 2 (1M-10M rows):** Add composite indexes, implement pagination
- **Phase 3 (10M+ rows):** Partition by date or user, consider archival strategy

**Implementation:**
```typescript
// Always use pagination for media queries
const getProjectMedia = async (projectId: number, page: number = 1, limit: number = 50) => {
  const offset = (page - 1) * limit;
  return db.select()
    .from(media)
    .where(eq(media.projectId, projectId))
    .orderBy(desc(media.createdAt))
    .limit(limit)
    .offset(offset);
};
```

#### 2. GPS Coordinate Queries

**Problem:** If you add location-based search, queries on latitude/longitude will be slow.

**Current Setup:**
```sql
-- Latitude/Longitude are stored as DECIMAL(10,7)
-- No spatial index currently
```

**Future Optimization:**
```sql
-- Add spatial index for geographic queries
ALTER TABLE media ADD SPATIAL INDEX idx_media_location (latitude, longitude);

-- Example geographic query (find all media within 5km)
SELECT * FROM media 
WHERE ST_Distance_Sphere(
  POINT(longitude, latitude),
  POINT(-97.5, 30.2)
) < 5000;
```

#### 3. Project Collaborator Lookups

**Problem:** Checking access permissions for large projects with many collaborators.

**Current Indexes:**
```sql
CREATE INDEX idx_collaborators_projectId ON project_collaborators(projectId);
CREATE INDEX idx_collaborators_userId ON project_collaborators(userId);
CREATE UNIQUE INDEX idx_collaborators_unique ON project_collaborators(projectId, userId);
```

**Optimization:** Cache permission checks in application layer (Redis) for frequently accessed projects.

### Database Maintenance Tasks

**Weekly:**
- Monitor slow query log
- Check disk usage
- Verify backup completion

**Monthly:**
- Analyze table statistics
- Optimize large tables
- Review index usage

**Quarterly:**
- Archive old projects (>1 year inactive)
- Purge expired invitations
- Review query performance

---

## Server Performance

### Current Setup

- **Framework:** Express.js (lightweight, ~50MB memory)
- **API Layer:** tRPC (type-safe, ~10ms overhead per request)
- **Deployment:** Single instance (auto-scales to multiple instances)

### Potential Bottlenecks

#### 1. PDF Report Generation

**Current Implementation:** Synchronous generation in request handler

**Problem:** Large PDFs (100+ photos) can take 10-30 seconds, causing timeouts

**Solution - Async Job Queue:**

```typescript
// Install: npm install bull redis

import Bull from 'bull';

const pdfQueue = new Bull('pdf-generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Queue a PDF generation job
export const queuePdfGeneration = async (projectId: number, userId: number) => {
  const job = await pdfQueue.add(
    { projectId, userId },
    { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
  );
  return job.id;
};

// Process jobs in background
pdfQueue.process(async (job) => {
  const { projectId, userId } = job.data;
  const pdf = await generateReportHTML(projectId);
  const buffer = await htmlToPdf(pdf);
  
  // Upload to S3
  const { url } = await storagePut(`reports/${projectId}-${Date.now()}.pdf`, buffer, 'application/pdf');
  
  // Notify user via email or notification
  await notifyOwner({
    title: 'PDF Report Ready',
    content: `Your report is ready: ${url}`,
  });
  
  return { url, projectId };
});
```

**Timeline:** 30s → 2-5s (async)

#### 2. Image Processing (Watermarking, Resizing)

**Current:** Likely synchronous during upload

**Problem:** Blocking upload requests, slow for large batches

**Solution - Async Image Processing:**

```typescript
// Use Sharp for image processing
import sharp from 'sharp';

const imageQueue = new Bull('image-processing');

export const queueImageProcessing = async (fileKey: string, operations: ImageOp[]) => {
  const job = await imageQueue.add({ fileKey, operations });
  return job.id;
};

imageQueue.process(async (job) => {
  const { fileKey, operations } = job.data;
  
  // Download from S3
  const buffer = await storageGet(fileKey);
  
  let image = sharp(buffer);
  
  // Apply operations
  for (const op of operations) {
    if (op.type === 'watermark') {
      image = image.composite([{ input: op.watermarkBuffer, gravity: op.gravity }]);
    }
    if (op.type === 'resize') {
      image = image.resize(op.width, op.height);
    }
  }
  
  // Upload processed image
  const processed = await image.toBuffer();
  const { url } = await storagePut(`processed/${fileKey}`, processed, 'image/jpeg');
  
  return { url, fileKey };
});
```

**Timeline:** 5-10s per image → 100ms (queued, processed in background)

#### 3. Map Rendering with Large Datasets

**Current:** Google Maps on client-side

**Problem:** 1000+ markers can cause UI lag

**Solution - Clustering & Heatmaps:**

```typescript
// Use Google Maps Clustering Library
import MarkerClusterer from '@googlemaps/markerclusterer';

// Cluster markers by proximity
const clusterer = new MarkerClusterer({ map, markers });

// Or use heatmap for density visualization
const heatmapData = mediaPoints.map(m => 
  new google.maps.LatLng(m.latitude, m.longitude)
);
const heatmap = new google.maps.visualization.HeatmapLayer({
  data: heatmapData,
  map: map,
});
```

### Server Monitoring Metrics

**Key Metrics to Track:**

```
1. Request Latency (p50, p95, p99)
2. Error Rate (4xx, 5xx)
3. Database Query Time
4. Memory Usage
5. CPU Usage
6. Active Connections
```

**Recommended Tools:**
- **Datadog** or **New Relic** for APM
- **CloudWatch** for infrastructure metrics
- **Sentry** for error tracking

---

## API Rate Limiting

### Current Status

**No rate limiting implemented** - Add before production scale.

### Recommended Rate Limits by Tier

| Endpoint | Free | Starter | Professional | Business | Enterprise |
|----------|------|---------|--------------|----------|------------|
| **API Calls/Hour** | 100 | 500 | 2,000 | 10,000 | Unlimited |
| **File Uploads/Day** | 10 | 50 | 500 | 5,000 | Unlimited |
| **PDF Exports/Day** | 5 | 20 | 100 | 500 | Unlimited |
| **Concurrent Requests** | 5 | 10 | 50 | 100 | Unlimited |

### Implementation with Express Rate Limit

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient();

// Global rate limiter
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:global:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // requests per window
  message: 'Too many requests, please try again later',
});

// Per-user rate limiter based on subscription tier
const userLimiter = (req, res, next) => {
  const user = req.user;
  const limits = {
    free: 100,
    starter: 500,
    professional: 2000,
    business: 10000,
    enterprise: Infinity,
  };
  
  const limiter = rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: `rl:user:${user.id}:`,
    }),
    windowMs: 60 * 60 * 1000,
    max: limits[user.subscriptionTier] || 100,
  });
  
  limiter(req, res, next);
};

// Apply to API routes
app.use('/api/trpc', globalLimiter, userLimiter);
```

---

## Subscription Tier Limits

### Recommended Tier Structure

```typescript
const SUBSCRIPTION_LIMITS = {
  free: {
    maxProjects: 3,
    maxMediaPerProject: 100,
    maxTotalMedia: 100,
    maxStorageGB: 1,
    features: ['basic_upload', 'view_map'],
  },
  starter: {
    maxProjects: 10,
    maxMediaPerProject: 1000,
    maxTotalMedia: 10000,
    maxStorageGB: 10,
    features: ['basic_upload', 'view_map', 'pdf_export', 'gps_export'],
  },
  professional: {
    maxProjects: 50,
    maxMediaPerProject: 10000,
    maxTotalMedia: 100000,
    maxStorageGB: 100,
    features: ['all_starter', 'watermark', 'batch_edit', 'api_access'],
  },
  business: {
    maxProjects: 200,
    maxMediaPerProject: 50000,
    maxTotalMedia: 500000,
    maxStorageGB: 500,
    features: ['all_professional', 'team_management', 'sso', 'analytics'],
  },
  enterprise: {
    maxProjects: Infinity,
    maxMediaPerProject: Infinity,
    maxTotalMedia: Infinity,
    maxStorageGB: Infinity,
    features: ['all_features', 'dedicated_support', 'custom_integration'],
  },
};
```

### Enforcement in Database

```typescript
// Check quota before allowing action
const checkUserQuota = async (userId: number, action: 'upload' | 'create_project') => {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const limits = SUBSCRIPTION_LIMITS[user.subscriptionTier];
  
  if (action === 'upload') {
    const mediaCount = await db.query.media.findMany({
      where: eq(media.userId, userId),
    });
    
    if (mediaCount.length >= limits.maxTotalMedia) {
      throw new Error(`Storage limit reached: ${limits.maxTotalMedia} media items`);
    }
  }
  
  if (action === 'create_project') {
    const projectCount = await db.query.projects.findMany({
      where: eq(projects.userId, userId),
    });
    
    if (projectCount.length >= limits.maxProjects) {
      throw new Error(`Project limit reached: ${limits.maxProjects} projects`);
    }
  }
};
```

---

## File Upload & Storage

### Current Setup

- **Storage:** S3 CDN
- **Max File Size:** No limit enforced
- **File Types:** Photos, videos, PDFs

### Recommended Limits

```typescript
const UPLOAD_LIMITS = {
  maxFileSize: 500 * 1024 * 1024, // 500 MB per file
  maxProjectSize: {
    free: 1 * 1024 * 1024 * 1024, // 1 GB
    starter: 10 * 1024 * 1024 * 1024, // 10 GB
    professional: 100 * 1024 * 1024 * 1024, // 100 GB
    business: 500 * 1024 * 1024 * 1024, // 500 GB
    enterprise: Infinity,
  },
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/tiff',
    'video/mp4',
    'video/quicktime',
    'application/pdf',
  ],
};
```

### Storage Cost Optimization

**Current Costs (AWS S3):**
- Storage: $0.023 per GB/month
- Data Transfer: $0.09 per GB (outbound)
- API Requests: $0.0004 per 1000 requests

**Optimization Strategies:**

1. **Image Compression:**
   - JPEG quality: 85% (saves 30-40% space)
   - PNG optimization: Use pngquant
   - WebP conversion: 25-35% smaller than JPEG

2. **Tiered Storage:**
   - Hot tier (S3 Standard): Current/recent projects
   - Warm tier (S3-IA): Projects 30+ days old
   - Cold tier (Glacier): Projects 90+ days old

3. **Cleanup Policies:**
   - Delete thumbnails after 1 year
   - Archive projects after 2 years
   - Implement user-initiated deletion

**Estimated Monthly Costs:**

| Users | Projects | Media | Storage | Monthly Cost |
|-------|----------|-------|---------|--------------|
| 100 | 500 | 50K | 50 GB | $50-100 |
| 1,000 | 5K | 500K | 500 GB | $200-400 |
| 10,000 | 50K | 5M | 5 TB | $1,500-2,500 |
| 100,000 | 500K | 50M | 50 TB | $10,000-15,000 |

---

## Concurrent User Handling

### Connection Pooling

**Current:** Manus manages database connections

**Recommended Configuration:**

```typescript
// drizzle.config.ts
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Connection pool settings
  poolConfig: {
    min: 2,
    max: 20, // Adjust based on expected concurrent users
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
```

### Load Balancing

**Current:** Manus auto-scales instances

**Recommended Setup:**
- 1-100 users: Single instance (2 CPU, 4GB RAM)
- 100-1000 users: 2-3 instances with load balancer
- 1000-10K users: 5-10 instances with auto-scaling
- 10K+ users: Regional distribution with CDN

### Session Management

**Current:** Cookie-based sessions

**Recommendation:** Switch to Redis-backed sessions at scale

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';
import redis from 'redis';

const redisClient = redis.createClient();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

```
Database:
- Query response time (p50, p95, p99)
- Slow query count
- Connection pool utilization
- Disk usage

API:
- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Throughput (requests/sec)
- Timeout rate

Infrastructure:
- CPU usage
- Memory usage
- Disk I/O
- Network bandwidth

Application:
- Active users
- PDF generation queue depth
- Image processing queue depth
- File upload rate
```

### Recommended Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| Database Query Time (p99) | > 5s | Page on-call |
| Error Rate | > 1% | Alert team |
| Memory Usage | > 80% | Auto-scale |
| Disk Usage | > 85% | Alert ops |
| Queue Depth (PDF) | > 1000 | Scale workers |
| API Latency (p99) | > 2s | Investigate |

### Logging Strategy

```typescript
// Use structured logging
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log important events
logger.info('PDF generation started', { projectId, userId, mediaCount });
logger.error('Database query timeout', { query, duration, userId });
logger.warn('Rate limit exceeded', { userId, endpoint, tier });
```

---

## Scaling Roadmap

### Phase 1: Foundation (0-1,000 users)

**Timeline:** Months 1-6

**Goals:**
- Establish monitoring
- Implement rate limiting
- Add subscription quota enforcement
- Optimize database queries

**Tasks:**
- [ ] Add database indexes
- [ ] Implement rate limiting per tier
- [ ] Add quota checks in API
- [ ] Set up monitoring dashboard
- [ ] Create runbook for common issues

**Expected Metrics:**
- API Latency: < 500ms (p95)
- Error Rate: < 0.1%
- Database: < 500MB

### Phase 2: Optimization (1,000-10,000 users)

**Timeline:** Months 6-12

**Goals:**
- Implement async job processing
- Add caching layer
- Optimize images
- Regional distribution

**Tasks:**
- [ ] Set up Redis for caching
- [ ] Implement Bull job queues
- [ ] Add image optimization pipeline
- [ ] Deploy CDN edge locations
- [ ] Add database read replicas

**Expected Metrics:**
- API Latency: < 300ms (p95)
- Error Rate: < 0.05%
- Database: < 5GB

### Phase 3: Scale (10,000-100,000 users)

**Timeline:** Year 2

**Goals:**
- Microservices architecture
- Database sharding
- Advanced caching
- Multi-region deployment

**Tasks:**
- [ ] Split into microservices (PDF, Image, API)
- [ ] Implement database sharding by user
- [ ] Add distributed caching
- [ ] Deploy to multiple regions
- [ ] Implement service mesh (Istio)

**Expected Metrics:**
- API Latency: < 200ms (p95)
- Error Rate: < 0.01%
- Database: 50GB+ (sharded)

---

## Troubleshooting

### Common Issues & Solutions

#### Issue: Slow PDF Generation

**Symptoms:** PDF export times > 30 seconds

**Diagnosis:**
```bash
# Check database query performance
SELECT * FROM media WHERE projectId = ? ORDER BY createdAt DESC;

# Check S3 upload speed
time aws s3 cp large-file.pdf s3://bucket/
```

**Solutions:**
1. Implement async job queue (see Server Performance section)
2. Reduce image resolution for PDF
3. Implement pagination for large projects
4. Add CloudFront caching

#### Issue: High Memory Usage

**Symptoms:** Server crashes, OOM errors

**Diagnosis:**
```bash
# Check Node.js memory usage
node --inspect app.js
# Use Chrome DevTools to profile

# Check database connection leaks
SHOW PROCESSLIST;
```

**Solutions:**
1. Implement connection pooling
2. Add memory limits to job workers
3. Implement garbage collection tuning
4. Scale horizontally (add more instances)

#### Issue: Database Timeouts

**Symptoms:** "Connection timeout" errors

**Diagnosis:**
```sql
-- Check slow queries
SHOW PROCESSLIST;
SHOW VARIABLES LIKE 'long_query_time';

-- Check table sizes
SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'mapit'
ORDER BY size_mb DESC;
```

**Solutions:**
1. Add missing indexes
2. Optimize slow queries
3. Increase connection pool size
4. Implement query caching

#### Issue: High API Error Rate

**Symptoms:** 5xx errors, user reports failures

**Diagnosis:**
```bash
# Check error logs
tail -f /var/log/app/error.log | grep 5xx

# Check database connectivity
mysql -h $DB_HOST -u $DB_USER -p -e "SELECT 1;"

# Check service health
curl http://localhost:3000/health
```

**Solutions:**
1. Check database connectivity
2. Review recent deployments
3. Check rate limiting configuration
4. Scale up instances

---

## Appendix: Useful Commands

### Database Monitoring

```sql
-- Check table sizes
SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'mapit'
ORDER BY size_mb DESC;

-- Check slow queries
SHOW PROCESSLIST;
SELECT * FROM mysql.slow_log LIMIT 10;

-- Check indexes
SHOW INDEX FROM media;

-- Check query execution plan
EXPLAIN SELECT * FROM media WHERE projectId = 1 ORDER BY createdAt DESC LIMIT 50;
```

### Performance Tuning

```sql
-- Analyze table statistics
ANALYZE TABLE media;
OPTIMIZE TABLE media;

-- Check current connections
SHOW STATUS LIKE 'Threads%';

-- Check query cache
SHOW STATUS LIKE 'Qcache%';
```

### Backup & Recovery

```bash
# Backup database
mysqldump -h $DB_HOST -u $DB_USER -p mapit > backup.sql

# Restore database
mysql -h $DB_HOST -u $DB_USER -p mapit < backup.sql

# Backup S3 bucket
aws s3 sync s3://mapit-bucket ./backup/
```

---

## References

- [MySQL Performance Tuning](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/BestPractices.html)
- [Express.js Performance](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js Scalability](https://nodejs.org/en/docs/guides/nodejs-performance-best-practices/)

---

**Questions or Updates?** Contact the development team or update this document as new information becomes available.
