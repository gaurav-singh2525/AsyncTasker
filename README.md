# AsyncTasker

A fault-tolerant asynchronous job processing system built with Node.js, Redis, and PostgreSQL.

AsyncTasker enables reliable background task execution through concurrent worker pools, delayed retries, timeout handling, and crash recovery. It is designed to demonstrate the core principles behind production-grade job queue systems such as BullMQ, Celery, Sidekiq, and AWS SQS consumers.

---

## Features

### Reliable Job Processing

* Asynchronous background task execution
* Redis-backed waiting queue
* PostgreSQL persistence layer
* Configurable worker concurrency

### Fault Tolerance

* Automatic retry mechanism
* Exponential backoff scheduling
* Delayed job execution
* Job timeout handling
* Worker crash recovery
* Service restart recovery

### Queue Management

* Waiting queue
* Active queue
* Delayed queue
* Failed jobs tracking
* Job lifecycle management

### Extensible Architecture

* Modular handler registry
* Multiple job types support
* Easy addition of new task handlers

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

* Node.js
* Express.js

### Database

* PostgreSQL

### Queue Layer

* Redis

### Concurrency

* Worker Pool Architecture
* Blocking Queue Consumption (BLMOVE)

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
Promise.race()
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

* Concurrent worker pool architecture
* Redis-backed asynchronous processing
* Exponential backoff retries
* Delayed scheduling with Redis Sorted Sets
* Crash recovery and queue reconstruction
* Timeout handling
* Fault-tolerant job execution
* PostgreSQL as source of truth

---

## Future Improvements

* Dead Letter Queue
* Job Priorities
* Scheduled Jobs
* Metrics Dashboard
* Distributed Workers
* Rate Limiting
* Web UI for Monitoring

---

## Learning Outcomes

This project explores several distributed systems and backend engineering concepts:

* Queue-based architectures
* Concurrent worker systems
* Fault tolerance
* Retry strategies
* Crash recovery
* Redis data structures
* Background task processing
* System reliability engineering

---

Built as a learning project to understand how modern background job processing systems work internally.
