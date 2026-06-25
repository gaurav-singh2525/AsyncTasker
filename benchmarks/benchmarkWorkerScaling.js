const { connectRedis } = require("../src/config/redis");
const config = require("./utils/config");
const { resetState } = require("./utils/setup");
const { startWorkers, stopWorkers } = require("./utils/workerProcess");
const { createJobsDirect } = require("./utils/jobFactory");
const { createTimer } = require("./utils/timer");
const { waitForCompletedJobs } = require("./utils/setup");
const {
    formatNumber,
    throughput,
    scalingEfficiency,
} = require("./utils/statistics");
const { reportBenchmark, formatTable } = require("./utils/reporter");

const FIXED_JOB_COUNT = 5000;

async function runScalingCase(workerCount) {
    await resetState();

    const workers = await startWorkers(workerCount);
    const timer = createTimer();

    try {
        await createJobsDirect(FIXED_JOB_COUNT);
        await waitForCompletedJobs(FIXED_JOB_COUNT);

        const elapsedSec = timer.elapsedSec();

        return {
            workerCount,
            jobCount: FIXED_JOB_COUNT,
            elapsedSec,
            jobsPerSec: throughput(FIXED_JOB_COUNT, elapsedSec),
        };
    } finally {
        await stopWorkers(workers);
    }
}

async function main() {
    await connectRedis();

    const results = [];

    for (const workerCount of config.WORKER_COUNTS) {
        results.push(await runScalingCase(workerCount));
    }

    const baseline = results[0];

    const rows = results.map((result) => {
        const efficiency =
            result.workerCount === baseline.workerCount
                ? "1.00"
                : formatNumber(
                      scalingEfficiency(
                          baseline.elapsedSec,
                          result.elapsedSec,
                          baseline.workerCount,
                          result.workerCount
                      )
                  );

        return [
            result.workerCount,
            formatNumber(result.elapsedSec),
            formatNumber(result.jobsPerSec),
            efficiency,
        ];
    });

    const markdown = formatTable(
        ["Workers", "Elapsed (s)", "Throughput (jobs/s)", "Scaling Efficiency"],
        rows
    );

    const best = results.reduce((current, candidate) =>
        candidate.jobsPerSec > current.jobsPerSec ? candidate : current
    );

    reportBenchmark({
        title: "Worker Scaling",
        consoleLines: [
            { label: "Workload", value: `${FIXED_JOB_COUNT} noop jobs` },
            { label: "Best Workers", value: String(best.workerCount) },
            {
                label: "Best Throughput",
                value: `${formatNumber(best.jobsPerSec)} jobs/sec`,
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

module.exports = { main, runScalingCase, FIXED_JOB_COUNT };
