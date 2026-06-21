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

const { connectRedis } = require("../config/redis");

const CONCURRENCY = 5;

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
            console.error(error);
        }
    }
}

async function bootstrap() {
    for (
        let i = 0;
        i < CONCURRENCY;
        i++
    ) {
        void startConsumer();
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

            await jobRepository.updateStatus(
                jobId,
                "queued"
            );

            await queueService.removeFromActive(
                jobId
            );

            await queueService.enqueue(jobId);

            console.log(
                `Job ${jobId} requeued`
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

async function main() {
    await connectRedis();
    await bootstrap();
}

main();

