const { Pool } = require("pg");
const { createClient } = require("redis");
const config = require("./config");
const { sleep } = require("./timer");

const WAITING_QUEUE = "jobs:waiting";
const ACTIVE_QUEUE = "jobs:active";
const DELAYED_QUEUE = "jobs:delayed";

let pool;
let redisClient;

async function getPool() {
    if (!pool) {
        pool = new Pool({
            host: config.DB.host,
            port: config.DB.port,
            database: config.DB.database,
            user: config.DB.user,
            password: config.DB.password,
            max: 20,
        });
    }

    return pool;
}

async function getRedis() {
    if (!redisClient) {
        redisClient = createClient({ url: config.REDIS_URL });
        redisClient.on("error", (error) => {
            throw error;
        });
        await redisClient.connect();
    }

    return redisClient;
}

async function closeConnections() {
    if (redisClient?.isOpen) {
        await redisClient.quit();
        redisClient = null;
    }

    if (pool) {
        await pool.end();
        pool = null;
    }
}

async function resetState() {
    const db = await getPool();
    const redis = await getRedis();

    await db.query("DELETE FROM jobs");
    await redis.del(WAITING_QUEUE, ACTIVE_QUEUE, DELAYED_QUEUE);
}

async function countJobsByStatus(status) {
    const db = await getPool();
    const result = await db.query(
        "SELECT COUNT(*)::int AS count FROM jobs WHERE status = $1",
        [status]
    );

    return result.rows[0].count;
}

async function waitForCompletedJobs(expectedCount, timeoutMs = config.COMPLETION_TIMEOUT_MS) {
    const timerStart = Date.now();

    while (Date.now() - timerStart < timeoutMs) {
        const completed = await countJobsByStatus("completed");

        if (completed >= expectedCount) {
            return {
                completed,
                elapsedMs: Date.now() - timerStart,
            };
        }

        await sleep(config.COMPLETION_POLL_MS);
    }

    const completed = await countJobsByStatus("completed");

    throw new Error(
        `Timed out waiting for ${expectedCount} completed jobs (got ${completed})`
    );
}

async function waitForJobStatus(jobId, status, timeoutMs = 60000) {
    const db = await getPool();
    const timerStart = Date.now();

    while (Date.now() - timerStart < timeoutMs) {
        const result = await db.query(
            "SELECT status, attempts, retry_at FROM jobs WHERE job_id = $1",
            [jobId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Job ${jobId} not found`);
        }

        const row = result.rows[0];

        if (row.status === status) {
            return {
                status: row.status,
                attempts: row.attempts,
                retryAt: row.retry_at,
            };
        }

        await sleep(config.COMPLETION_POLL_MS);
    }

    throw new Error(`Timed out waiting for job ${jobId} to reach status ${status}`);
}

async function getJob(jobId) {
    const db = await getPool();
    const result = await db.query(
        "SELECT job_id, status, attempts, max_attempts, retry_at, updated_at FROM jobs WHERE job_id = $1",
        [jobId]
    );

    return result.rows[0] || null;
}

async function seedRecoverableJobs(count) {
    const db = await getPool();
    const { v4: uuidv4 } = require("uuid");
    const statuses = ["queued", "active", "delayed"];
    const batch = [];

    for (let i = 0; i < count; i++) {
        const status = statuses[i % statuses.length];
        const jobId = uuidv4();
        const retryAt =
            status === "delayed"
                ? new Date(Date.now() + 60000)
                : null;

        batch.push({ jobId, status, retryAt });
    }

    const chunkSize = 500;

    for (let i = 0; i < batch.length; i += chunkSize) {
        const chunk = batch.slice(i, i + chunkSize);
        const values = [];
        const placeholders = chunk
            .map((job, index) => {
                const offset = index * 5;
                values.push(
                    job.jobId,
                    config.DEFAULT_JOB_TYPE,
                    JSON.stringify({}),
                    job.status,
                    job.retryAt
                );

                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
            })
            .join(", ");

        await db.query(
            `INSERT INTO jobs (job_id, type, payload, status, retry_at)
             VALUES ${placeholders}`,
            values
        );
    }

    return batch.length;
}

async function getQueueLengths() {
    const redis = await getRedis();

    const [waiting, active, delayed] = await Promise.all([
        redis.lLen(WAITING_QUEUE),
        redis.lLen(ACTIVE_QUEUE),
        redis.zCard(DELAYED_QUEUE),
    ]);

    return { waiting, active, delayed };
}

module.exports = {
    getPool,
    getRedis,
    closeConnections,
    resetState,
    countJobsByStatus,
    waitForCompletedJobs,
    waitForJobStatus,
    getJob,
    seedRecoverableJobs,
    getQueueLengths,
    WAITING_QUEUE,
    ACTIVE_QUEUE,
    DELAYED_QUEUE,
};
