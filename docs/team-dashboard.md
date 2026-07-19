# Optional team dashboard

The dashboard stores versioned TCalc JSON reports, never source files. It binds to `127.0.0.1` by default.

```powershell
$env:TCALC_DASHBOARD_TOKEN = "replace-with-a-secret"
pnpm --filter @wma/dashboard start
```

Upload a report with `Authorization: Bearer <token>` to `POST /api/reports`. Set `TCALC_DATA_DIR`, `TCALC_DASHBOARD_HOST`, and `PORT` when self-hosting on a low-cost Node service.
