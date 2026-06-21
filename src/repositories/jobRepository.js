const pool = require("../config/db");

async function create(job) {
    const query = `
        INSERT INTO jobs (
            job_id,
            type,
            payload
        )
        VALUES ($1, $2, $3)
        RETURNING *;
    `;

    const values = [
        job.jobId,
        job.type,
        job.payload
    ];

    const result = await pool.query(query, values);

    return mapRow(result.rows[0]);
}

async function findById(jobId) {
    const query = `
        SELECT *
        FROM jobs
        WHERE job_id = $1;
    `;

    const result = await pool.query(query, [jobId]);

    if (result.rows.length === 0) {
        return null;
    }

    return mapRow(result.rows[0]);
}

function mapRow(row) {
    return {
        jobId: row.job_id,
        type: row.type,
        payload: row.payload,
        status: row.status,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async function incrementAttempts(jobId) {
    const query = `
        UPDATE jobs
        SET attempts = attempts + 1,
            updated_at = NOW()
        WHERE job_id = $1
        RETURNING *;
    `;

    const result = await pool.query(
        query,
        [jobId]
    );

    return mapRow(result.rows[0]);
}
async function updateStatus(
    jobId,
    status
) {
    const query = `
        UPDATE jobs
        SET status = $2,
            updated_at = NOW()
        WHERE job_id = $1
        RETURNING *;
    `;

    const result = await pool.query(
        query,
        [jobId, status]
    );

    return mapRow(result.rows[0]);

}




module.exports = {
    create,
    findById,
    incrementAttempts,
    updateStatus,
};