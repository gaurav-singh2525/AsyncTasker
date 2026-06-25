const { v4: uuidv4 } = require("uuid");
const jobRepository = require("../../src/repositories/jobRepository");
const config = require("./config");
const { getRedis, WAITING_QUEUE } = require("./setup");

async function createJobDirect(type = config.DEFAULT_JOB_TYPE, payload = {}) {
    const job = {
        jobId: uuidv4(),
        type,
        payload,
    };

    const createdJob = await jobRepository.create(job);
    await jobRepository.updateStatus(createdJob.jobId, "queued");

    return createdJob;
}

async function createJobsDirect(count, type = config.DEFAULT_JOB_TYPE, payload = {}) {
    const jobs = [];
    const batchSize = 100;

    for (let i = 0; i < count; i += batchSize) {
        const currentBatch = Math.min(batchSize, count - i);
        const batchJobs = await Promise.all(
            Array.from({ length: currentBatch }, () =>
                createJobDirect(type, payload)
            )
        );
        jobs.push(...batchJobs);
    }

    // Bulk enqueue all created jobIds to ensure Redis waiting queue matches DB state.
    const redis = await getRedis();
    const jobIds = jobs.map((job) => job.jobId);

    // Chunk to keep arguments reasonable.
    const chunkSize = 500;
    for (let i = 0; i < jobIds.length; i += chunkSize) {
        await redis.rPush(WAITING_QUEUE, jobIds.slice(i, i + chunkSize));
    }

    return jobs;
}

async function createJobViaApi(type = config.DEFAULT_JOB_TYPE) {
    const response = await fetch(`${config.API_BASE_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`API error ${response.status}: ${body}`);
    }

    return response.json();
}

async function measureApiCreateLatency(samples) {
    const latencies = [];

    for (let i = 0; i < samples; i++) {
        const start = performance.now();
        await createJobViaApi(config.DEFAULT_JOB_TYPE);
        latencies.push(performance.now() - start);
    }

    return latencies;
}

module.exports = {
    createJobDirect,
    createJobsDirect,
    createJobViaApi,
    measureApiCreateLatency,
};
