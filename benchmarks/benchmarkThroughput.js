const { connectRedis } = require("../src/config/redis");
const config = require("./utils/config");
const { resetState, waitForCompletedJobs } = require("./utils/setup");
const { startWorkers, stopWorkers } = require("./utils/workerProcess");
const { createJobsDirect } = require("./utils/jobFactory");
const { createTimer } = require("./utils/timer");
const { formatNumber, throughput } = require("./utils/statistics");
const { reportBenchmark, formatTable } = require("./utils/reporter");

async function runThroughputCase(jobCount, workerCount = 5) {
    await resetState();

    const workers = await startWorkers(workerCount);
    const timer = createTimer();

    try {
        await createJobsDirect(jobCount);
        await waitForCompletedJobs(jobCount);

        const elapsedSec = timer.elapsedSec();
        const jobsPerSec = throughput(jobCount, elapsedSec);

        return {
            jobCount,
            workerCount,
            elapsedSec,
            jobsPerSec,
            avgJobLatencyMs: (elapsedSec * 1000) / jobCount,
        };
    } finally {
        await stopWorkers(workers);
    }
}

async function main() {
    await connectRedis();

    const results = [];

    for (const jobCount of config.THROUGHPUT_JOB_COUNTS) {
        const result = await runThroughputCase(jobCount, 5);
        results.push(result);
    }

    const markdown = formatTable(
        ["Jobs", "Workers", "Elapsed (s)", "Throughput (jobs/s)", "Avg Job Latency (ms)"],
        results.map((result) => [
            result.jobCount,
            result.workerCount,
            formatNumber(result.elapsedSec),
            formatNumber(result.jobsPerSec),
            formatNumber(result.avgJobLatencyMs),
        ])
    );

    const last = results[results.length - 1];

    reportBenchmark({
        title: "Throughput",
        consoleLines: [
            { label: "Workers", value: String(last.workerCount) },
            { label: "Jobs", value: String(last.jobCount) },
            { label: "Elapsed Time", value: `${formatNumber(last.elapsedSec)} sec` },
            {
                label: "Throughput",
                value: `${formatNumber(last.jobsPerSec)} jobs/sec`,
            },
            {
                label: "Average Job Latency",
                value: `${formatNumber(last.avgJobLatencyMs)} ms`,
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

module.exports = { main, runThroughputCase };
