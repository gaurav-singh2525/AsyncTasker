# AsyncTasker

A fault-tolerant asynchronous job processing system built with Node.js, Redis, and PostgreSQL.

AsyncTasker enables reliable background task execution through concurrent worker pools, delayed retries, timeout handling, and crash recovery. It is designed to demonstrate the core principles behind production-grade job queue systems such as BullMQ, Celery, Sidekiq, and AWS SQS consumers.

---

## Features

### Reliable Job Processing

- Asynchronous background task execution
- Redis-backed waiting queue
- PostgreSQL persistence layer
- Configurable worker concurrency

### Fault Tolerance

- Automatic retry mechanism
- Exponential backoff scheduling
- Delayed job execution
- Job timeout handling
- Worker crash recovery
- Service restart recovery

### Queue Management

- Waiting queue
- Active queue
- Delayed queue
- Failed jobs tracking
- Job lifecycle management

### Extensible Architecture

- Modular handler registry
- Multiple job types support
- Easy addition of new task handlers

---

## Architecture

```text
                   ┌──────────────┐
                   │   Client     │
                   └──────┬───────┘
                          │
                          ▼
                  POST /jobs API
                          │
                          ▼
                 PostgreSQL (Source of Truth)
                          │
                          ▼
                 Redis Waiting Queue
                          │
                          ▼
                    Worker Pool
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
   Success                            Failure
        │                                   │
        ▼                                   ▼
   Completed                       Delayed Queue
                                            │
                                            ▼
                                   Delay Scheduler
                                            │
                                            ▼
                                     Waiting Queue
```

---

## Job Lifecycle

```text
pending_to_queue
       │
       ▼
    queued
       │
       ▼
    active
   ┌───┴────┐
   │        │
   ▼        ▼
completed delayed
             │
             ▼
           queued
             │
             ▼
           active
             │
             ▼
           failed
```

---

## Tech Stack

### Backend

- Node.js
- Express.js

### Database

- PostgreSQL

### Queue Layer

- Redis

### Concurrency

- Worker Pool Architecture
- Blocking Queue Consumption (BLMOVE)

---

## Redis Data Structures Used

### Waiting Queue

```text
jobs:waiting
```

Redis List storing jobs waiting for execution.

### Active Queue

```text
jobs:active
```

Redis List storing currently executing jobs.

### Delayed Queue

```text
jobs:delayed
```

Redis Sorted Set storing delayed jobs.

```text
score = retry timestamp
value = jobId
```

This allows efficient retrieval of jobs whose retry time has arrived.

---

## Database Schema

```sql
CREATE TABLE jobs (
    job_id UUID PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    retry_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Retry Strategy

AsyncTasker implements exponential backoff.

```text
Attempt 1 → Retry after 10 seconds
Attempt 2 → Retry after 20 seconds
Attempt 3 → Mark as failed
```

Formula:

```js
delay = Math.pow(2, attempts) * 5000;
```

This prevents repeated retries from overwhelming downstream services.

---

## Crash Recovery

PostgreSQL acts as the source of truth.

On startup:

1. Recover queued jobs
2. Recover active jobs abandoned by crashed workers
3. Restore delayed jobs
4. Rebuild Redis queues

This ensures jobs are not lost after service failures.

---

## Timeout Handling

Jobs exceeding the configured timeout are automatically failed and retried.

Example:

```env
JOB_TIMEOUT_MS=5000
```

Implementation uses:

```js
Promise.race();
```

to detect long-running tasks and prevent workers from being blocked indefinitely.

---

## Example Job

Request:

```json
{
  "type": "email",
  "payload": {
    "to": "user@example.com",
    "subject": "Welcome",
    "body": "Welcome to AsyncTasker"
  }
}
```

Response:

```json
{
  "jobId": "f665dd10-7e14-4a74-89c2-01a69cd53002",
  "status": "queued"
}
```

---

## Running Locally

### Clone Repository

```bash
git clone <repository-url>
cd AsyncTasker
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create `.env`

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=asynctasker
DB_USER=postgres
DB_PASSWORD=your_password

REDIS_URL=redis://localhost:6379

JOB_TIMEOUT_MS=5000
```

### Start API Server

```bash
node server.js
```

### Start Worker System

```bash
node src/workers/index.js
```

---

## API Endpoints

### Create Job

```http
POST /jobs
```

Request:

```json
{
  "type": "email"
}
```

### Get Job

```http
GET /jobs/:jobId
```

---

## Project Highlights

- Concurrent worker pool architecture
- Redis-backed asynchronous processing
- Exponential backoff retries
- Delayed scheduling with Redis Sorted Sets
- Crash recovery and queue reconstruction
- Timeout handling
- Fault-tolerant job execution
- PostgreSQL as source of truth

---

## Benchmarks

This repository includes a small end-to-end benchmarking suite under `benchmarks/`.
The goal is to measure **AsyncTasker’s performance** (worker pool + Redis queues + PostgreSQL persistence),
not Redis/PostgreSQL in isolation.

### How to run

1. Start required services (as described in the main README):
   - Redis
   - PostgreSQL
2. Start the API server for API latency:
   ```bash
   node server.js
   ```
3. Run the reduced benchmark suite (most important 4 benchmarks):
   ```bash
   node benchmarks/runAll.js
   ```

Benchmark results are appended to `benchmarks/results.md`.

### Methodology

Key choices made to keep results meaningful and reproducible:

- **Deterministic job handler**: the benchmarks use the `noop` handler by default to avoid external variability.
- **Completion detection**: completion is determined by polling job `status` from PostgreSQL.
- **Worker scaling**: benchmark varies `WORKER_CONCURRENCY` in the worker process while keeping workload fixed.
- **Environment**: database and queue configuration are loaded from your local `.env`.

### Hardware / Software Details

- CPU: Intel i5-12450H
- Cores / Threads: 12 Cores
- RAM: 12GB
- OS: Linux
- Node.js: v24.12.0
- Redis: Redis server v=7.0.15
- PostgreSQL: Version 16.14

### Results (latest run)

#### Throughput

| Jobs  | Workers | Elapsed (s) | Throughput (jobs/s) | Avg Job Latency (ms) |
| ----- | ------- | ----------- | ------------------- | -------------------- |
| 1000  | 5       | 1.65        | 605.75              | 1.65                 |
| 5000  | 5       | 7.71        | 648.15              | 1.54                 |
| 10000 | 5       | 15.15       | 659.99              | 1.52                 |

#### Worker Scaling

| Workers | Elapsed (s) | Throughput (jobs/s) | Scaling Efficiency |
| ------- | ----------- | ------------------- | ------------------ |
| 1       | 30.57       | 163.53              | 1.00               |
| 2       | 17.61       | 283.86              | 0.87               |
| 5       | 7.41        | 674.67              | 0.83               |
| 10      | 4.57        | 1093.45             | 0.67               |

#### API Latency (POST `/jobs`)

| Metric  | Latency (ms) |
| ------- | ------------ |
| Average | 5.65         |
| Median  | 5.78         |
| P95     | 7.56         |
| P99     | 8.46         |
| Maximum | 12.43        |

#### Recovery Performance

| Jobs  | Recovered | Startup Time (s) | Recovery Throughput (jobs/s) | Waiting | Active | Delayed |
| ----- | --------- | ---------------- | ---------------------------- | ------- | ------ | ------- |
| 1000  | 1000      | 0.51             | 1973.43                      | 667     | 0      | 333     |
| 5000  | 5000      | 2.32             | 2152.03                      | 3334    | 0      | 1999    |
| 10000 | 10000     | 4.59             | 2176.89                      | 6667    | 0      | 5332    |

### Interpretation (quick)

- Throughput increases with workload size, with slightly varying jobs/sec as Redis/Postgres overhead amortizes.
- Scaling efficiency decreases at higher worker counts, which is expected due to contention in the queue + persistence path.
- API latency is low because `POST /jobs` only enqueues the job; execution happens asynchronously.
- Recovery startup time scales sub-linearly with job volume in this run, indicating efficient rebuild/enqueue behavior.

---

## Future Improvements

- Dead Letter Queue
- Job Priorities
- Scheduled Jobs
- Metrics Dashboard
- Distributed Workers
- Rate Limiting
- Web UI for Monitoring

---

## Learning Outcomes

This project explores several distributed systems and backend engineering concepts:

- Queue-based architectures
- Concurrent worker systems
- Fault tolerance
- Retry strategies
- Crash recovery
- Redis data structures
- Background task processing
- System reliability engineering

---

Built as a learning project to understand how modern background job processing systems work internally.
