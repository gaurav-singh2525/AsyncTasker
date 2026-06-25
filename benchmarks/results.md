# AsyncTasker Benchmark Results


## Throughput

_Run at: 2026-06-25T07:56:39.437Z_

| Jobs | Workers | Elapsed (s) | Throughput (jobs/s) | Avg Job Latency (ms) |
| --- | --- | --- | --- | --- |
| 1000 | 5 | 1.65 | 605.75 | 1.65 |
| 5000 | 5 | 7.71 | 648.15 | 1.54 |
| 10000 | 5 | 15.15 | 659.99 | 1.52 |

## Worker Scaling

_Run at: 2026-06-25T07:57:47.698Z_

| Workers | Elapsed (s) | Throughput (jobs/s) | Scaling Efficiency |
| --- | --- | --- | --- |
| 1 | 30.57 | 163.53 | 1.00 |
| 2 | 17.61 | 283.86 | 0.87 |
| 5 | 7.41 | 674.67 | 0.83 |
| 10 | 4.57 | 1093.45 | 0.67 |

## API Latency (POST /jobs)

_Run at: 2026-06-25T07:57:50.592Z_

| Metric | Latency (ms) |
| --- | --- |
| Average | 5.65 |
| Median | 5.78 |
| P95 | 7.56 |
| P99 | 8.46 |
| Maximum | 12.43 |

## Recovery Performance

_Run at: 2026-06-25T07:57:58.259Z_

| Jobs | Recovered | Startup Time (s) | Recovery Throughput (jobs/s) | Waiting | Active | Delayed |
| --- | --- | --- | --- | --- | --- | --- |
| 1000 | 1000 | 0.51 | 1973.43 | 667 | 0 | 333 |
| 5000 | 5000 | 2.32 | 2152.03 | 3334 | 0 | 1999 |
| 10000 | 10000 | 4.59 | 2176.89 | 6667 | 0 | 5332 |

---

## Full Suite Summary

_Run at: 2026-06-25T07:56:08.796Z_

- Throughput: completed
- Worker Scaling: completed
- API Latency: completed
- Recovery: completed
