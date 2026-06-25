require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../..");

module.exports = {
    ROOT_DIR,
    PORT: Number(process.env.PORT) || 3000,
    API_BASE_URL:
        process.env.BENCHMARK_API_URL ||
        `http://localhost:${process.env.PORT || 3000}`,
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    DB: {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || "asynctasker",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
    },
    JOB_TIMEOUT_MS: Number(process.env.JOB_TIMEOUT_MS) || 5000,
    THROUGHPUT_JOB_COUNTS: [1000, 5000, 10000],
    WORKER_COUNTS: [1, 2, 5, 10],
    RECOVERY_JOB_COUNTS: [1000, 5000, 10000],
    LATENCY_REQUEST_COUNT: Number(process.env.BENCHMARK_LATENCY_REQUESTS) || 500,
    QUEUE_ITERATIONS: Number(process.env.BENCHMARK_QUEUE_ITERATIONS) || 1000,
    RESOURCE_JOB_COUNT: Number(process.env.BENCHMARK_RESOURCE_JOBS) || 10000,
    COMPLETION_POLL_MS: 100,
    COMPLETION_TIMEOUT_MS:
        Number(process.env.BENCHMARK_COMPLETION_TIMEOUT_MS) || 600000,
    WORKER_STARTUP_MS: 2000,
    RESULTS_PATH: path.resolve(__dirname, "../results.md"),
    DEFAULT_JOB_TYPE: "noop",
    RETRY_JOB_TYPE: "fail",
};
