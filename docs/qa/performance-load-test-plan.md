# Performance & Load Test Plan — ProSiddhi
**Owner: QA Lead + Infra (Nayan) + Backend (Asrar).** Fed by the `SYS-PERF-*` cases. Non-functional; runs late in the cycle against a scaled dataset.

---

## 1. Objectives
Prove the platform is responsive and stable under realistic and peak load **before** go-live, and find the breaking point. The audience is low-end Android phones on patchy networks — **latency and payload size matter as much as throughput.**

## 2. Targets (proposed — confirm with Product/Infra)
| Metric | Target |
|---|---|
| API p95 latency (read) | < 300 ms |
| API p95 latency (write: post/unlock/checkout) | < 800 ms |
| Job feed / candidate search p95 | < 500 ms at 100k+ profiles |
| Error rate under target load | < 0.1% |
| Concurrent users (target) | **[CONFIRM]** e.g. 2,000 concurrent |
| Peak (admission-season spike) | **[CONFIRM]** e.g. 5,000 concurrent |
| Availability | **[CONFIRM]** e.g. 99.5% |

## 3. Scenarios (from SYS-PERF + real workload)
1. **Candidate FTS search at scale** — 100k+ seeker profiles, deep pagination under concurrent inserts (keyset stability). `SYS-PERF-001`
2. **Job feed** — search + filters under concurrent posting; no dup/skip across pages. `SYS-PERF-008`
3. **Hot employer** — 40+ jobs, thousands of applicants; dashboard + lists. `SYS-PERF-002`
4. **Chat polling thundering herd** — many concurrent 5s pollers; DB load, backoff. `SYS-PERF-003`
5. **Dashboard revenue aggregation** — 12-month trend over large PaymentHistory. `SYS-PERF-004`
6. **Taxonomy tree** — thousands of nodes. `SYS-PERF-005`
7. **OTP-send / registration spike** — burst; rate-limit + provider cost. `SYS-PERF-007`
8. **Notification fan-out** — many recipients, batched. `SYS-PERF-006`
9. **Checkout/webhook under load** — concurrent payments, idempotency holds under contention.
10. **Soak test** — sustained moderate load for 4–8h (memory leaks, connection-pool creep, cron overlap).
11. **Stress-to-break** — ramp until failure; verify graceful degradation (503/backpressure, `SYS-RESIL-004`), then recovery.

## 4. Workload model
Blend to real ratios: mostly seeker reads (feed/search/apply), employer writes (post/unlock/checkout) a smaller share, admin minimal. **[Confirm the read:write mix and daily peak hour.]**

## 5. Tooling & data
- **Load tool:** k6 or JMeter (API-level). Realistic think-times.
- **Scaled dataset:** seed 100k+ profiles, 10k+ jobs, payment history — a seeding script (dev support).
- **Environment:** a production-like instance (not the shared test box) so results are meaningful. Isolated so it doesn't corrupt functional testing.
- **Observability:** APM/DB metrics (query time, pool usage, CPU/mem), Sentry.

## 6. Metrics captured
p50/p95/p99 latency per endpoint · throughput (req/s) · error rate · CPU/mem/DB-pool utilisation · DB slow-query log · time-to-recover after stress.

## 7. Entry / Exit
- **Entry:** production-like env, scaled data, tool + scripts ready, targets agreed.
- **Exit:** targets met at target load; graceful degradation + recovery demonstrated at stress; no memory leak over soak; slow queries indexed; a signed performance summary.

## 8. Risks
Shared test box gives misleading numbers · polling design (locked, no WebSockets) is the scale watch-item · load setup needs dev/infra time (fold into the ~1-week track).
