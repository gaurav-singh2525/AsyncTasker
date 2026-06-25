const fs = require("fs");
const path = require("path");
const config = require("./config");
const { formatNumber } = require("./statistics");

function ensureResultsFile() {
    const dir = path.dirname(config.RESULTS_PATH);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(config.RESULTS_PATH)) {
        fs.writeFileSync(
            config.RESULTS_PATH,
            "# AsyncTasker Benchmark Results\n\n",
            "utf8"
        );
    }
}

function printSection(title, lines) {
  console.log("\n=====================================");
  console.log("AsyncTasker Benchmark Report");
  console.log("=====================================\n");
  console.log(`Benchmark:\n${title}\n`);

  for (const line of lines) {
    if (line.label && line.value !== undefined) {
      console.log(`${line.label}:\n${line.value}\n`);
    } else if (line.text) {
      console.log(`${line.text}\n`);
    }
  }

  console.log("=====================================\n");
}

function appendMarkdown(title, markdown) {
    ensureResultsFile();

    const timestamp = new Date().toISOString();
    const section = `\n## ${title}\n\n_Run at: ${timestamp}_\n\n${markdown}\n`;

    fs.appendFileSync(config.RESULTS_PATH, section, "utf8");
}

function formatTable(headers, rows) {
    const headerLine = `| ${headers.join(" | ")} |`;
    const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
    const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");

    return `${headerLine}\n${separatorLine}\n${body}`;
}

function reportBenchmark({
    title,
    consoleLines,
    markdown,
    summary,
}) {
    printSection(title, consoleLines);

    if (markdown) {
        appendMarkdown(title, markdown);
    }

    return summary;
}

function formatThroughputLine(jobs, elapsedSec) {
    const jobsPerSec = jobs / Math.max(elapsedSec, Number.EPSILON);

    return `${formatNumber(jobsPerSec)} jobs/sec`;
}

module.exports = {
    ensureResultsFile,
    printSection,
    appendMarkdown,
    formatTable,
    reportBenchmark,
    formatThroughputLine,
};
