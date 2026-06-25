const { connectRedis } = require("../src/config/redis");
const config = require("./utils/config");
const { resetState, waitForCompletedJobs } = require("./utils/setup");
const { startWorkers, stopWorkers } = require("./utils/workerProcess");
const { createJobsDirect } = require("./utils/jobFactory");
const { createTimer } = require("./utils/timer");
const { formatNumber } = require("./utils/statistics");
const { reportBenchmark, formatTable } = require("./utils/reporter");
const {
    sampleChildProcess,
    summarizeSamples,
} = require("./utils/resourceMonitor");

async function main() {
    await connectRedis();
    await resetState();

    const workers = await startWorkers(5);
    const sampling = sampleChildProcess(workers, config.COMPLETION_TIMEOUT_MS);

    const timer = createTimer();
    await createJobsDirect(config.RESOURCE_JOB_COUNT);
    await waitForCompletedJobs(config.RESOURCE_JOB_COUNT);
    const elapsedSec = timer.elapsedSec();

    const samples = await sampling;
    await stopWorkers(workers);

    const summary = summarizeSamples(samples);
    const benchmarkMemory = process.memoryUsage();

    const markdown = formatTable(
        ["Metric", "Value"],
        [
            ["Jobs", String(config.RESOURCE_JOB_COUNT)],
            ["Workers", "5"],
            ["Elapsed (s)", formatNumber(elapsedSec)],
            ["Avg CPU (%)", formatNumber(summary.avgCpu)],
            ["Peak Worker RSS (MB)", formatNumber(summary.peakRssMb)],
            ["Peak Benchmark Heap (MB)", formatNumber(summary.peakHeapMb)],
            [
                "Benchmark Heap Used (MB)",
                formatNumber(benchmarkMemory.heapUsed / (1024 * 1024)),
            ],
        ]
    );

    reportBenchmark({
        title: "Resource Usage",
        consoleLines: [
            { label: "Jobs", value: String(config.RESOURCE_JOB_COUNT) },
            { label: "Workers", value: "5" },
            { label: "Elapsed Time", value: `${formatNumber(elapsedSec)} sec` },
            {
                label: "Average CPU Utilization",
                value: `${formatNumber(summary.avgCpu)} %`,
            },
            {
                label: "Peak Worker RSS",
                value: `${formatNumber(summary.peakRssMb)} MB`,
            },
            {
                label: "Peak Benchmark Heap",
                value: `${formatNumber(summary.peakHeapMb)} MB`,
            },
            { text: markdown },
        ],
        markdown,
        summary: {
            elapsedSec,
            ...summary,
            benchmarkHeapMb: benchmarkMemory.heapUsed / (1024 * 1024),
        },
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
