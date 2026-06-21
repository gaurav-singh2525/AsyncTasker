require("dotenv").config();

const app = require("./src/app");

const {
    connectRedis
} = require(
    "./src/config/redis"
);

const PORT =
    process.env.PORT || 3000;

async function start() {

    await connectRedis();

    app.listen(PORT, () => {
        console.log(
            `Server running on ${PORT}`
        );
    });
}

start();