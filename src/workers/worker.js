require("dotenv").config();

const queueService = require(
    "../services/queueService"
);

const jobRepository = require(
    "../repositories/jobRepository"
);

const handlers = require(
    "./handlerRegistry"
);

const { redisClient } =
    require("../config/redis");

const { connectRedis } = require("../config/redis");

const CONCURRENCY = 5;


async function bootstrap() {
    for (
        let i = 0;
        i < CONCURRENCY;
        i++
    ) {
        void startConsumer();
    }
}

async function startConsumer() {
    while (true) {
        try {
            console.log(
                "Waiting for job..."
            );

            const jobId =
                await queueService.moveToActive();

            console.log(
                `Received Job: ${jobId}`
            );

            await processJob(jobId);

        } catch (error) {
            console.error(
                "OUTER ERROR STACK:"
            );

            console.error(
                error.stack
            );
        }
    }
}

async function processJob(jobId) {
    const job =
        await jobRepository.findById(jobId);

    if (!job) {

        console.error(
            `Job ${jobId} not found`
        );

        await queueService.removeFromActive(
            jobId
        );

        return;
    }

    await jobRepository.incrementAttempts(
        jobId
    );

    await jobRepository.updateStatus(
        jobId,
        "active"
    );

    const handler =
        handlers[job.type];

    if (!handler) {
        throw new Error(
            `No handler for ${job.type}`
        );
    }

    try {
        await handler(job);

        await jobRepository.updateStatus(
            jobId,
            "completed"
        );

        await queueService.removeFromActive(
            jobId
        );

        console.log(
            `Job ${jobId} completed`
        );

    } catch (error) {

        console.error(
            `Job ${jobId} failed`,
            error.message
        );

        const updatedJob =
            await jobRepository.findById(jobId);


        if (
            updatedJob.attempts <
            updatedJob.maxAttempts
        ) {

            console.log(`attempts:${updatedJob.attempts} `);

            const delay =
                Math.pow(
                    2,
                    updatedJob.attempts
                ) * 5000;

            const retryAt =
                Date.now() + delay;

            await jobRepository.updateStatus(
                jobId,
                "delayed"
            );

            await jobRepository.updateRetryAt(
                jobId,
                new Date(retryAt)
            );

            await queueService.removeFromActive(
                jobId
            );

            await queueService.addToDelayed(
                jobId,
                retryAt
            );

            console.log(
                `Job ${jobId} delayed for ${delay} ms`
            );

        } else {

            await jobRepository.updateStatus(
                jobId,
                "failed"
            );

            await queueService.removeFromActive(
                jobId
            );

            console.log(
                `Job ${jobId} permanently failed`
            );
        }
    }

}


module.exports = bootstrap;
