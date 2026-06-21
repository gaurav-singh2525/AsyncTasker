require("dotenv").config();

const { connectRedis } =
    require("../config/redis");

const recoverJobs =
    require("./recoveryWorker");

const startDelayScheduler =
    require("./delayScheduler");

const startWorkers =
    require("./worker");
const bootstrap = require("./worker");

async function main() {

    await connectRedis();

    await recoverJobs();

    startDelayScheduler();

    await bootstrap();
}

main();