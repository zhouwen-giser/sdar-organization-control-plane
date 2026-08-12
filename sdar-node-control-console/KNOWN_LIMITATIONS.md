# Known Limitations

1. `EXT-SDAR-NODE-CONTROL-TASK-CONTROL-001`: the selected SDAR local integration branch exposes Task list/detail/binding reads but returns HTTP 404 `RESOURCE_NOT_FOUND` for frozen pause/resume/cancel routes. Console command mappings are complete; SDAR owns the missing implementation.
2. The Goal uses a fixed loopback deployment identity and server-only bearer token. Interactive login, token acquisition and session management are intentionally not implemented.
3. Evidence pages manage v1.4.1 export configuration, delivery metadata, issue/dead-letter state and recovery. Evidence Analytics, ClickHouse and Evaluation queries are not Console surfaces.
4. The repository `validate:full` browser wrapper expects a system `chromium` executable. The application browser completed the real P09 core journey, but the local wrapper remains environment-dependent when Chromium is absent from PATH.
5. Current Runtime Readiness is time-bounded and may show `PROVIDER_AVAILABILITY_EXPIRED` after the one-minute authority window. The Console intentionally displays that fail-closed state and never promotes stale data.
