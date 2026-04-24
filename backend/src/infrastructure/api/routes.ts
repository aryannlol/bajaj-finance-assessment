import { Router } from "express";
import { z } from "zod";
import { HierarchyProcessor } from "../../application/HierarchyProcessor.js";

const processor = new HierarchyProcessor();
const postSchema = z.object({
  data: z.array(z.unknown())
});

export const bfhlRouter = Router();

bfhlRouter.get("/", (_req, res) => {
  res.status(200).json({
    operation_code: 1,
    message: "Hierarchy processor is running",
    endpoint: "POST /bfhl"
  });
});

bfhlRouter.post("/", (req, res) => {
  const payload = postSchema.safeParse(req.body);
  if (!payload.success) {
    res.status(400).json({
      is_success: false,
      message: "Invalid request body. Expected: { data: string[] }",
      errors: payload.error.issues
    });
    return;
  }

  const result = processor.run(payload.data.data);
  res.status(200).json(result);
});

