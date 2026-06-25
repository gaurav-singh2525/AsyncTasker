module.exports = async function noopHandler(job) {
    const sleepMs = job.payload?.sleepMs ?? 0;

    if (sleepMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
    }
};
