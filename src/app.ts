import express from "express";
import cors from "cors";
import path from "path";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(
  express.static(path.join(process.cwd(), "public"))
);

app.use(
  "/chatbackflutter",
  express.static(path.join(process.cwd(), "public"))
);
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "public/uploads"))
  );
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