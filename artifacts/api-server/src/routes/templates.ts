import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";
import { GetTemplateParams } from "@workspace/api-zod";
import { serializeTemplate } from "../lib/serialize";

const router: IRouter = Router();

router.get("/templates", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(templatesTable)
    .orderBy(templatesTable.id);
  res.json(rows.map(serializeTemplate));
});

router.get("/templates/:id", async (req, res): Promise<void> => {
  const params = GetTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.id, params.data.id));

  if (!template) {
    res.status(404).json({ error: "القالب غير موجود" });
    return;
  }

  res.json(serializeTemplate(template));
});

export default router;
