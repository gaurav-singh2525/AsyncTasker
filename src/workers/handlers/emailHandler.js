// async function emailHandler(job) {
//     console.log(
//         `[EMAIL] Processing job ${job.jobId}`
//     );

//     await new Promise((resolve) =>
//         setTimeout(resolve, 5000)
//     );

//     console.log(
//         `[EMAIL] Completed job ${job.jobId}`
//     );
// }

// module.exports = emailHandler;

async function emailHandler(job) {

    console.log(
        `Processing ${job.jobId}`
    );

    throw new Error("SMTP Down");
}

module.exports = emailHandler;