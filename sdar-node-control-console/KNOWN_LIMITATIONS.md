# Known Limitations

1. The frozen backend package explicitly declares implementation pending. The delivery therefore uses a deterministic Contract-first Local Validation Gateway and does not claim live backend integration.
2. Authentication, token acquisition and session management are not implemented. The role switcher validates UI scope behavior only.
3. Node Events are locally simulated; no real SSE connection is opened.
4. Commands and created records live in browser memory and reset on refresh.
5. No telemetry query is implemented, by protocol design. Telemetry pages manage export configuration and delivery status only.
6. Browser validation was executed with the installed Chromium through CDP against the final Vite bundle.
