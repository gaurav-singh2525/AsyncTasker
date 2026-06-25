const { connectRedis } = require("../src/config/redis");
const config = require("./utils/config");
const { resetState } = require("./utils/setup");
const { isApiReachable } = require("./utils/workerProcess");
const { measureApiCreateLatency } = require("./utils/jobFactory");
const { summarize, formatNumber } = require("./utils/statistics");
const { reportBenchmark, formatTable } = require("./utils/reporter");

async function main() {
    const reachable = await isApiReachable();

    if (!reachable) {
        throw new Error(
            `API server is not reachable at ${config.API_BASE_URL}. Start it with: node server.js`
        );
    }

    await connectRedis();
    await resetState();

    const latencies = await measureApiCreateLatency(
        config.LATENCY_REQUEST_COUNT
    );
    const stats = summarize(latencies);

    const markdown = formatTable(
        ["Metric", "Latency (ms)"],
        [
            ["Average", formatNumber(stats.mean)],
            ["Median", formatNumber(stats.median)],
            ["P95", formatNumber(stats.p95)],
            ["P99", formatNumber(stats.p99)],
            ["Maximum", formatNumber(stats.max)],
        ]
    );

    reportBenchmark({
        title: "API Latency (POST /jobs)",
        consoleLines: [
            { label: "Requests", value: String(config.LATENCY_REQUEST_COUNT) },
            { label: "Average", value: `${formatNumber(stats.mean)} ms` },
            { label: "Median", value: `${formatNumber(stats.median)} ms` },
            { label: "P95", value: `${formatNumber(stats.p95)} ms` },
            { label: "P99", value: `${formatNumber(stats.p99)} ms` },
            { label: "Maximum", value: `${formatNumber(stats.max)} ms` },
            { text: markdown },
        ],
        markdown,
        summary: stats,
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
