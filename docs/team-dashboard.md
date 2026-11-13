# Optional team dashboard

The dashboard stores versioned TCalc JSON reports, never source files. It binds to `127.0.0.1` by default.

```powershell
$env:TCALC_DASHBOARD_TOKEN = "replace-with-a-secret"
pnpm --filter @wma/dashboard start
```

Upload a report with `Authorization: Bearer <token>` to `POST /api/reports`. Set `TCALC_DATA_DIR`, `TCALC_DASHBOARD_HOST`, and `PORT` when self-hosting on a low-cost Node service.

## Who can read saved reports

Saved reports are **private by default**. A report listing exposes workspace paths, per-language
totals, and file-level metadata, so both `GET /api/reports` and `GET /api/reports/:id` require
authentication.

| Caller | Read reports | Upload reports |
| --- | --- | --- |
| `Authorization: Bearer <token>` | Yes | Yes |
| Browser session cookie | Yes | No |
| No credentials | No | No |
| No credentials, with `TCALC_DASHBOARD_PUBLIC_READ` enabled | Yes | No |

If `TCALC_DASHBOARD_TOKEN` is unset, the service has no way to authenticate anyone: uploads and
reads both return `503`, and nothing stored in `TCALC_DATA_DIR` is served.

### Reading reports in a browser

The dashboard UI is a static bundle, so it never contains the token. When the saved-reports list
returns `401`, the page offers an unlock form. It sends the token once to `POST /api/session`, which
returns an opaque session id in an `HttpOnly`, `SameSite=Strict` cookie that expires after 12 hours.
The token itself is never stored in the browser and page scripts cannot read the cookie.

That cookie grants **read-only** access. Uploads always require the bearer token, so a cross-site
page cannot use an operator's cookie to forge a report. `DELETE /api/session` ends the session.

Any non-loopback deployment — anywhere `TCALC_DASHBOARD_HOST` is not `127.0.0.1` — must be served
over HTTPS, typically behind a trusted reverse proxy that terminates TLS. `HttpOnly` and
`SameSite=Strict` protect the session cookie from page scripts and cross-site misuse, but they do
not protect the token or the cookie in transit: over plain HTTP the operator's token and every
request carrying the cookie travel in cleartext, readable by anyone on the network path. Only TLS
protects data in transit. The server marks the cookie `Secure` once it sees an HTTPS request,
directly or through `x-forwarded-proto`.

### Opting into public reads

Set `TCALC_DASHBOARD_PUBLIC_READ` to `1` (or `true`, `yes`, `on`) only when saved reports are
deliberately meant to be world-readable — for example an internal demo with synthetic data:

```powershell
$env:TCALC_DASHBOARD_PUBLIC_READ = "1"
```

This allows unauthenticated `GET` on every stored report to anyone who can reach the port. It never
enables unauthenticated uploads. The service logs a warning at startup while it is on. Leave it
unset for any deployment holding real workspace data, especially with a non-loopback
`TCALC_DASHBOARD_HOST`.
