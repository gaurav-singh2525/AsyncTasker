const { connectRedis, blockingRedisClient } = require("../src/config/redis");
const queueService = require("../src/services/queueService");
const config = require("./utils/config");
const { resetState, WAITING_QUEUE, ACTIVE_QUEUE } = require("./utils/setup");
const { getRedis } = require("./utils/setup");
const { v4: uuidv4 } = require("uuid");
const { summarize, formatNumber } = require("./utils/statistics");
const { reportBenchmark, formatTable } = require("./utils/reporter");

async function timeEnqueue(iterations) {
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
        const jobId = uuidv4();
        const start = performance.now();
        await queueService.enqueue(jobId);
        latencies.push(performance.now() - start);
    }

    return latencies;
}

async function timeMoveToActive(iterations) {
    const redis = await getRedis();
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
        const jobId = uuidv4();
        await redis.rPush(WAITING_QUEUE, jobId);

        const start = performance.now();
        await blockingRedisClient.blMove(
            WAITING_QUEUE,
            ACTIVE_QUEUE,
            "RIGHT",
            "LEFT",
            1
        );
        latencies.push(performance.now() - start);
    }

    return latencies;
}

async function timeRemoveFromActive(iterations) {
    const redis = await getRedis();
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
        const jobId = uuidv4();
        await redis.lPush(ACTIVE_QUEUE, jobId);

        const start = performance.now();
        await queueService.removeFromActive(jobId);
        latencies.push(performance.now() - start);
    }

    return latencies;
}

function formatStatsRow(operation, stats) {
    return [
        operation,
        formatNumber(stats.mean),
        formatNumber(stats.median),
        formatNumber(stats.p95),
        formatNumber(stats.p99),
        formatNumber(stats.max),
    ];
}

async function main() {
    await connectRedis();

    const iterations = config.QUEUE_ITERATIONS;
    const results = [];

    await resetState();
    results.push({
        operation: "enqueue",
        stats: summarize(await timeEnqueue(iterations)),
    });

    await resetState();
    results.push({
        operation: "moveToActive",
        stats: summarize(await timeMoveToActive(iterations)),
    });

    await resetState();
    results.push({
        operation: "removeFromActive",
        stats: summarize(await timeRemoveFromActive(iterations)),
    });

    const markdown = formatTable(
        ["Operation", "Avg (ms)", "Median (ms)", "P95 (ms)", "P99 (ms)", "Max (ms)"],
        results.map((result) =>
            formatStatsRow(result.operation, result.stats)
        )
    );

    const enqueue = results.find((result) => result.operation === "enqueue");

    reportBenchmark({
        title: "Queue Performance",
        consoleLines: [
            { label: "Iterations", value: String(iterations) },
            {
                label: "Enqueue Latency (avg)",
                value: `${formatNumber(enqueue.stats.mean)} ms`,
            },
            { text: markdown },
        ],
        markdown,
        summary: results,
    });
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };
