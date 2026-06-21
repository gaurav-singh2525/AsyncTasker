require("dotenv").config();

const {
    connectRedis
} = require("../config/redis");

const queueService =
    require("../services/queueService");

const jobRepository =
    require("../repositories/jobRepository");

async function recoverJobs() {

    console.log(
        "Starting Recovery..."
    );

    const jobs =
        await jobRepository.findRecoverableJobs();

    console.log(
        `Found ${jobs.length} jobs`
    );

    for (const job of jobs) {
        
        const status = job.status;
        if (status == "queued") {
            await queueService.enqueue(
                job.jobId
            );

            console.log(
                `Recovered queued job ${job.jobId}`
            );
        }
        else if (status == "active") {
            await jobRepository.updateStatus(
                job.jobId,
                "queued"
            );

            await queueService.enqueue(
                job.jobId
            );

            console.log(
                `Recovered active job ${job.jobId}`
            );
        }
        else if (status === "delayed") {

            const now = Date.now();

            if (
                new Date(job.retryAt)
                    .getTime() <= now
            ) {

                await jobRepository.updateStatus(
                    job.jobId,
                    "queued"
                );

                await queueService.enqueue(
                    job.jobId
                );

                console.log(
                    `Recovered expired delayed job ${job.jobId}`
                );

            } else {

                await queueService.addToDelayed(
                    job.jobId,
                    new Date(job.retryAt)
                        .getTime()
                );

                console.log(
                    `Recovered delayed job ${job.jobId}`
                );
            }
        }
    }
    console.log(
        "Recovery completed."
    );

}

module.exports = recoverJobs;