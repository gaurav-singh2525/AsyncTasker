const fs = require("fs/promises");
const os = require("os");

async function readProcStat(pid) {
    const stat = await fs.readFile(`/proc/${pid}/stat`, "utf8");
    const closing = stat.lastIndexOf(")");
    const fields = stat.slice(closing + 2).split(" ");

    return {
        utime: Number(fields[11]),
        stime: Number(fields[12]),
    };
}

async function readProcRssMb(pid) {
    const status = await fs.readFile(`/proc/${pid}/status`, "utf8");
    const match = status.match(/^VmRSS:\s+(\d+)\s+kB/m);

    if (!match) {
        return 0;
    }

    return Number(match[1]) / 1024;
}

async function sampleChildProcess(child, durationMs, intervalMs = 500) {
    const samples = [];
    const start = Date.now();
    let previous;

    while (Date.now() - start < durationMs) {
        if (child.exitCode !== null) {
            break;
        }

        try {
            const cpu = await readProcStat(child.pid);
            const rssMb = await readProcRssMb(child.pid);
            const memory = process.memoryUsage();
            const now = Date.now();

            if (previous) {
                const elapsedMs = now - previous.timestamp;
                const cpuTicks = cpu.utime + cpu.stime - previous.cpuTicks;
                const cpuPercent =
                    (cpuTicks / os.cpus().length / (elapsedMs / 10)) * 100;

                samples.push({
                    cpuPercent: Math.max(0, cpuPercent),
                    rssMb,
                    heapUsedMb: memory.heapUsed / (1024 * 1024),
                });
            }

            previous = {
                timestamp: now,
                cpuTicks: cpu.utime + cpu.stime,
            };
        } catch {
            break;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return samples;
}

function summarizeSamples(samples) {
    if (samples.length === 0) {
        return {
            avgCpu: 0,
            peakRssMb: 0,
            peakHeapMb: 0,
        };
    }

    return {
        avgCpu:
            samples.reduce((sum, sample) => sum + sample.cpuPercent, 0) /
            samples.length,
        peakRssMb: Math.max(...samples.map((sample) => sample.rssMb)),
        peakHeapMb: Math.max(...samples.map((sample) => sample.heapUsedMb)),
    };
}

module.exports = {
    sampleChildProcess,
    summarizeSamples,
};
