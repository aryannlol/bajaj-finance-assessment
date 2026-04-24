import cors from "cors";
import express from "express";
import { bfhlRouter } from "./infrastructure/api/routes.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

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

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Hierarchy API listening at http://localhost:${port}`);
});

