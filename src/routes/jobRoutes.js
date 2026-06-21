const express = require("express");
const router = express.Router();

const {
    createJob,
    getJob,
} = require("../controllers/jobController");

router.post("/", createJob);

router.get("/:jobId", getJob);

module.exports = router;