function nowMs() {
    return Number(process.hrtime.bigint()) / 1e6;
}

function createTimer() {
    const start = nowMs();

    return {
        elapsedMs() {
            return nowMs() - start;
        },
        elapsedSec() {
            return (nowMs() - start) / 1000;
        },
    };
}

async function measureAsync(fn) {
    const start = nowMs();
    const result = await fn();
    const elapsedMs = nowMs() - start;

    return { result, elapsedMs };
}

function measureSync(fn) {
    const start = nowMs();
    const result = fn();
    const elapsedMs = nowMs() - start;

    return { result, elapsedMs };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    nowMs,
    createTimer,
    measureAsync,
    measureSync,
    sleep,
};
