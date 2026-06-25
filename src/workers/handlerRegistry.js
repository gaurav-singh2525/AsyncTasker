const emailHandler = require("./handlers/emailHandler");
const noopHandler = require("./handlers/noopHandler");
const failHandler = require("./handlers/failHandler");

const handlers = {
    email: emailHandler,
    noop: noopHandler,
    fail: failHandler,
};

module.exports = handlers;