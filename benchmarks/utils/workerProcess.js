const { spawn } = require("child_process");
const path = require("path");
const config = require("./config");
const { sleep } = require("./timer");

function spawnWorkerProcess(workerConcurrency) {
    const child = spawn(
        process.execPath,
        [path.join(config.ROOT_DIR, "src/workers/index.js")],
        {
            cwd: config.ROOT_DIR,
            env: {
                ...process.env,
                WORKER_CONCURRENCY: String(workerConcurrency),
            },
            stdio: ["ignore", "pipe", "pipe"],
        }
    );

    child.stdout.on("data", (chunk) => {
        process.stdout.write(
            `[worker:${workerConcurrency}] ${chunk.toString()}`
        );
    });

    child.stderr.on("data", (chunk) => {
        process.stderr.write(
            `[worker:${workerConcurrency}:err] ${chunk.toString()}`
        );
    });

    child.on("exit", (code, signal) => {
        process.stderr.write(
            `[worker:${workerConcurrency}] exited code=${code} signal=${signal}\n`
        );
    });

    return child;
}

async function startWorkers(workerConcurrency) {
    const child = spawnWorkerProcess(workerConcurrency);
    await sleep(config.WORKER_STARTUP_MS);

    if (child.exitCode !== null) {
        throw new Error(
            `Worker process exited early with code ${child.exitCode}`
        );
    }

    return child;
}

function stopWorkers(child) {
    if (!child || child.killed) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        child.once("exit", () => resolve());

        if (!child.kill("SIGTERM")) {
            resolve();
            return;
        }

        setTimeout(() => {
            if (!child.killed) {
                child.kill("SIGKILL");
            }
        }, 5000);
    });
}

async function isApiReachable() {
    try {
        const response = await fetch(`${config.API_BASE_URL}/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "noop" }),
        });

        return response.ok || response.status === 201;
    } catch {
        return false;
    }
}

module.exports = {
    spawnWorkerProcess,
    startWorkers,
    stopWorkers,
    isApiReachable,
};
