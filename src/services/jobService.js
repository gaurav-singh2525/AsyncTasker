const jobRepository = require("../repositories/jobRepository");
const queueService =
    require("./queueService");
const { v4: uuidv4 } = require("uuid");

async function createJob(type, payload = {}) {

    const job = {
        jobId: uuidv4(),
        type,
        payload,
    };

    const createdJob =
        await jobRepository.create(job);

    await queueService.enqueue(
        createdJob.jobId
    );

    const updatedJob =
        await jobRepository.updateStatus(
            createdJob.jobId,
            "queued"
        );

    return updatedJob;
    
}

async function getJobById(jobId) {
    return await jobRepository.findById(jobId);
}

module.exports = {
    createJob,
    getJobById,
};