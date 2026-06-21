require("dotenv").config();

const {
    connectRedis,
} = require("../config/redis");

const queueService =
    require("../services/queueService");

const jobRepository =
    require("../repositories/jobRepository");

async function checkDelayedJobs() {

    const now = Date.now();

    const jobs =
        await queueService.getReadyDelayedJobs(
            now
        );

    for (const jobId of jobs) {

        await queueService.removeFromDelayed(
            jobId
        );

        await queueService.enqueue(
            jobId
        );

        await jobRepository.updateStatus(
            jobId,
            "queued"
        );

        console.log(
            `Requeued delayed job ${jobId}`
        );
    }
}

function startDelayScheduler() {

    console.log(
        "Delay Scheduler Started"
    );

    setInterval(
        checkDelayedJobs,
        1000
    );
}

module.exports =
    startDelayScheduler;
