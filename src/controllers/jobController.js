const jobService = require("../services/jobService");

async function createJob(req, res) {
    const { type } = req.body;

    if (!type) {
        return res.status(400).json({
            error: "type is required",
        });
    }

    try {
        const job = await jobService.createJob(type);

        return res.status(201).json(job);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
}

async function getJob(req, res) {
    const { jobId } = req.params;

    try {
       const job = await jobService.getJobById(jobId);
        if (!job) {
            return res.status(404).json({
                error: "Job not found",
            });
        }

        return res.status(201).json(job);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
}

module.exports = {
    createJob,
    getJob,
};

