import cors from "cors";
import express from "express";
import path from "path";
import { bfhlRouter } from "./infrastructure/api/routes.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"]
  })
);
app.use(express.json());

// API routes
app.use("/bfhl", bfhlRouter);

// 🔥 Serve frontend build
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// Error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({
    is_success: false,
    message: "Unexpected server error",
    error: err instanceof Error ? err.message : String(err)
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});