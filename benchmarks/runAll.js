const fs = require("fs");
const path = require("path");
const config = require("./utils/config");
const { ensureResultsFile } = require("./utils/reporter");
const { closeConnections } = require("./utils/setup");

const benchmarks = [
    { name: "Throughput", script: "./benchmarkThroughput.js" },
    { name: "Worker Scaling", script: "./benchmarkWorkerScaling.js" },
    { name: "API Latency", script: "./benchmarkLatency.js" },
    { name: "Recovery", script: "./benchmarkRecovery.js" },
];

async function runAll() {
    ensureResultsFile();

    const startedAt = new Date().toISOString();
    const summary = [];

    for (const benchmark of benchmarks) {
        console.log(`\n>>> Running ${benchmark.name}...\n`);

        const modulePath = path.resolve(__dirname, benchmark.script);
        delete require.cache[modulePath];

        const runner = require(modulePath);

        if (typeof runner.main === "function") {
            await runner.main();
        }

        summary.push({
            name: benchmark.name,
            status: "completed",
        });
    }

    const footer = `\n---\n\n## Full Suite Summary\n\n_Run at: ${startedAt}_\n\n${summary
        .map((entry) => `- ${entry.name}: ${entry.status}`)
        .join("\n")}\n`;

    fs.appendFileSync(config.RESULTS_PATH, footer, "utf8");
    await closeConnections();
}

if (require.main === module) {
    runAll()
        .then(() => process.exit(0))
        .catch(async (error) => {
            console.error(error);
            await closeConnections();
            process.exit(1);
        });
}

module.exports = { runAll };
