const { connectRedis } = require("../src/config/redis");
const recoverJobs = require("../src/workers/recoveryWorker");
const config = require("./utils/config");
const {
    resetState,
    seedRecoverableJobs,
    getQueueLengths,
} = require("./utils/setup");
const { createTimer } = require("./utils/timer");
const { formatNumber, throughput } = require("./utils/statistics");
const { reportBenchmark, formatTable } = require("./utils/reporter");

async function runRecoveryCase(jobCount) {
    await resetState();
    const seeded = await seedRecoverableJobs(jobCount);

    const timer = createTimer();
    const originalLog = console.log;
    console.log = () => {};

    try {
        await recoverJobs();
    } finally {
        console.log = originalLog;
    }

    const elapsedSec = timer.elapsedSec();

    const queueLengths = await getQueueLengths();
    const recoveredJobs = seeded;

    return {
        jobCount,
        seeded,
        recoveredJobs,
        elapsedSec,
        recoveryThroughput: throughput(seeded, elapsedSec),
        queueLengths,
    };
}

async function main() {
    await connectRedis();

    const results = [];

    for (const jobCount of config.RECOVERY_JOB_COUNTS) {
        results.push(await runRecoveryCase(jobCount));
    }

    const markdown = formatTable(
        [
            "Jobs",
            "Recovered",
            "Startup Time (s)",
            "Recovery Throughput (jobs/s)",
            "Waiting",
            "Active",
            "Delayed",
        ],
        results.map((result) => [
            result.jobCount,
            result.recoveredJobs,
            formatNumber(result.elapsedSec),
            formatNumber(result.recoveryThroughput),
            result.queueLengths.waiting,
            result.queueLengths.active,
            result.queueLengths.delayed,
        ])
    );

    const last = results[results.length - 1];

    reportBenchmark({
        title: "Recovery Performance",
        consoleLines: [
            { label: "Jobs Recovered", value: String(last.recoveredJobs) },
            {
                label: "Recovery Startup Time",
                value: `${formatNumber(last.elapsedSec)} sec`,
            },
            {
                label: "Recovery Throughput",
                value: `${formatNumber(last.recoveryThroughput)} jobs/sec`,
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

module.exports = { main, runRecoveryCase };
