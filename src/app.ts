import express from "express";
import cors from "cors";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      message: "Server is running",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      websocket: true,
    });
  });

  return app;
}