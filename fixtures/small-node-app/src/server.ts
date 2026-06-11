import express from "express";

const app = express();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/data", (_req, res) => {
  res.json({ received: true });
});

export function serve(config: { port: number; host: string }) {
  app.listen(config.port, config.host);
}
