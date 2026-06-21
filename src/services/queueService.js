const { redisClient } =
    require("../config/redis");

const QUEUE_NAME = "jobs:waiting";
const WAITING_QUEUE = "jobs:waiting";
const ACTIVE_QUEUE = "jobs:active";

async function enqueue(jobId) {
    await redisClient.rPush(
        QUEUE_NAME,
        jobId
    );
}

async function dequeue() {
    const result = await redisClient.blPop(
        QUEUE_NAME,
        0
    );

    return result.element;
}

async function moveToActive() {
    const result =
        await redisClient.blMove(
            WAITING_QUEUE,
            ACTIVE_QUEUE,
            "RIGHT",
            "LEFT",
            0
        )

    return result;
}


async function removeFromActive(
    jobId
) {
    await redisClient.lRem(
        ACTIVE_QUEUE,
        1,
        jobId
    );
}

module.exports = {
    enqueue,
    dequeue,
    moveToActive,
    removeFromActive,
};