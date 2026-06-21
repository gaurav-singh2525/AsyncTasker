const { createClient } = require("redis");

const redisClient = createClient({
    url: process.env.REDIS_URL,
});

// Dedicated client for blocking commands
const blockingRedisClient =
    redisClient.duplicate();

redisClient.on("error", (err) => {
    console.error(
        "Redis Error:",
        err
    );
});

blockingRedisClient.on(
    "error",
    (err) => {
        console.error(
            "Blocking Redis Error:",
            err
        );
    }
);

async function connectRedis() {

    if (!redisClient.isOpen) {
        await redisClient.connect();
    }

    if (!blockingRedisClient.isOpen) {
        await blockingRedisClient.connect();
    }
}

module.exports = {
    redisClient,
    blockingRedisClient,
    connectRedis,
};