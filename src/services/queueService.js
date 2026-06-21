const {
    redisClient,
    blockingRedisClient
} = require("../config/redis");


const WAITING_QUEUE = "jobs:waiting";
const ACTIVE_QUEUE = "jobs:active";
const DELAYED_QUEUE = "jobs:delayed";

async function enqueue(jobId) {
    await redisClient.rPush(
        WAITING_QUEUE,
        jobId
    );
}

async function dequeue() {
    const result = await redisClient.blPop(
        WAITING_QUEUE,
        0
    );

    return result.element;
}

async function moveToActive() {

    return await blockingRedisClient.blMove(
        WAITING_QUEUE,
        ACTIVE_QUEUE,
        "RIGHT",
        "LEFT",
        0
    );
}


async function removeFromActive(jobId) {
    return await redisClient.lRem(
        ACTIVE_QUEUE,
        1,
        jobId
    );
}

async function addToDelayed(
    jobId,
    retryAt
) {
    await redisClient.zAdd(
        DELAYED_QUEUE,
        [
            {
                score: retryAt,
                value: jobId,
            },
        ]
    );
}


async function getReadyDelayedJobs(
    now
) {
    return await redisClient.zRangeByScore(
        DELAYED_QUEUE,
        0,
        now
    );
}


async function removeFromDelayed(
    jobId
) {
    await redisClient.zRem(
        DELAYED_QUEUE,
        jobId
    );
}
module.exports = {
    enqueue,
    dequeue,
    moveToActive,
    removeFromActive,
    addToDelayed,
    getReadyDelayedJobs,
    removeFromDelayed,
};