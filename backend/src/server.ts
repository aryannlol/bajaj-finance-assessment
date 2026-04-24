import cors from "cors";
import express from "express";
import { bfhlRouter } from "./infrastructure/api/routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"]
  })
);
app.use(express.json());

app.use("/bfhl", bfhlRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Keep a safe API contract even for unexpected runtime errors.
  res.status(500).json({
    is_success: false,
    message: "Unexpected server error",
    error: err instanceof Error ? err.message : String(err)
  });
});

app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});

