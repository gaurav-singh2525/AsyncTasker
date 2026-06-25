function sortNumeric(values) {
    return [...values].sort((a, b) => a - b);
}

function mean(values) {
    if (values.length === 0) {
        return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, p) {
    if (values.length === 0) {
        return 0;
    }

    const sorted = sortNumeric(values);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    const clamped = Math.max(0, Math.min(sorted.length - 1, index));

    return sorted[clamped];
}

function summarize(values) {
    const sorted = sortNumeric(values);

    return {
        count: sorted.length,
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        mean: mean(sorted),
        median: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
    };
}

function throughput(jobs, elapsedSec) {
    if (elapsedSec <= 0) {
        return 0;
    }

    return jobs / elapsedSec;
}

function scalingEfficiency(baselineSec, scaledSec, baselineWorkers, scaledWorkers) {
    if (scaledSec <= 0 || baselineSec <= 0) {
        return 0;
    }

    const idealSpeedup = scaledWorkers / baselineWorkers;
    const actualSpeedup = baselineSec / scaledSec;

    return actualSpeedup / idealSpeedup;
}

function formatNumber(value, digits = 2) {
    return Number(value).toFixed(digits);
}

module.exports = {
    mean,
    percentile,
    summarize,
    throughput,
    scalingEfficiency,
    formatNumber,
};
