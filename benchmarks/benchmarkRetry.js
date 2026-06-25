const { connectRedis } = require("../src/config/redis");
const config = require("./utils/config");
const { resetState, getJob } = require("./utils/setup");
const { startWorkers, stopWorkers } = require("./utils/workerProcess");
const { createJobDirect } = require("./utils/jobFactory");
const { sleep } = require("./utils/timer");
const { formatNumber } = require("./utils/statistics");
const { reportBenchmark, formatTable } = require("./utils/reporter");

function expectedRetryDelayMs(attempts) {
    return Math.pow(2, attempts) * 5000;
}

async function waitForStatusChange(jobId, status, timeoutMs) {
    const timerStart = Date.now();

    while (Date.now() - timerStart < timeoutMs) {
        const job = await getJob(jobId);

        if (job?.status === status) {
            return Date.now();
        }

        await sleep(50);
    }

    throw new Error(`Timed out waiting for job ${jobId} to reach ${status}`);
}

async function measureRetryAttempt() {
    await resetState();

    const workers = await startWorkers(1);

    try {
        const job = await createJobDirect(config.RETRY_JOB_TYPE, {
            message: "benchmark retry failure",
        });

        const delayedAt = await waitForStatusChange(job.jobId, "delayed", 30000);
        const delayedJob = await getJob(job.jobId);
        const expectedDelayMs = expectedRetryDelayMs(delayedJob.attempts);

        const activeAt = await waitForStatusChange(
            job.jobId,
            "active",
            expectedDelayMs + 15000
        );

        const observedDelayMs = activeAt - delayedAt;
        const deviationMs = observedDelayMs - expectedDelayMs;
        const deviationPct = (deviationMs / expectedDelayMs) * 100;

        return {
            attempts: delayedJob.attempts,
            expectedDelayMs,
            observedDelayMs,
            deviationMs,
            deviationPct,
            retryAt: delayedJob.retry_at,
        };
    } finally {
        await stopWorkers(workers);
        await sleep(500);
    }
}

async function main() {
    await connectRedis();

    const samples = [];

    for (let i = 0; i < 3; i++) {
        samples.push(await measureRetryAttempt());
    }

    const markdown = formatTable(
        [
            "Attempt",
            "Expected Delay (ms)",
            "Observed Delay (ms)",
            "Deviation (ms)",
            "Deviation (%)",
        ],
        samples.map((sample) => [
            sample.attempts,
            formatNumber(sample.expectedDelayMs, 0),
            formatNumber(sample.observedDelayMs, 0),
            formatNumber(sample.deviationMs, 0),
            formatNumber(sample.deviationPct),
        ])
    );

    const averageDeviation =
        samples.reduce((sum, sample) => sum + sample.deviationMs, 0) /
        samples.length;

    const last = samples[samples.length - 1];

    reportBenchmark({
        title: "Retry Accuracy",
        consoleLines: [
            { label: "Samples", value: String(samples.length) },
            {
                label: "Expected Retry Delay",
                value: `${formatNumber(last.expectedDelayMs, 0)} ms`,
            },
            {
                label: "Observed Retry Delay",
                value: `${formatNumber(last.observedDelayMs, 0)} ms`,
            },
            {
                label: "Average Deviation",
                value: `${formatNumber(averageDeviation, 0)} ms`,
            },
            { text: markdown },
        ],
        markdown,
        summary: { samples, averageDeviation },
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

module.exports = { main, measureRetryAttempt, expectedRetryDelayMs };
