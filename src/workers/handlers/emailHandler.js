module.exports = async function emailHandler(job) {

    const {
        to,
        subject
    } = job.payload;

    console.log(
        `[EMAIL] Sending email to ${to}`
    );

    await new Promise(
        resolve =>
            setTimeout(resolve, 2000)
    );

    const shouldFail =
        Math.random() < 0.3;

    if (shouldFail) {
        throw new Error(
            "SMTP Server Unavailable"
        );
    }

    console.log(
        `[EMAIL] Subject: ${subject}`
    );

    console.log(
        `[EMAIL] Email sent successfully`
    );
};