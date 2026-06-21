function withTimeout(
    promise,
    timeoutMs
) {

    return Promise.race([
        promise,

        new Promise((_, reject) =>
            setTimeout(
                () =>
                    reject(
                        new Error(
                            "Job Timeout"
                        )
                    ),
                timeoutMs
            )
        )
    ]);
}

module.exports = withTimeout;