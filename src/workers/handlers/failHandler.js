module.exports = async function failHandler(job) {
    throw new Error(
        job.payload?.message || "Intentional failure for benchmark"
    );
};
