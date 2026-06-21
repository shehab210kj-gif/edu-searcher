import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import {
  AnalyzeProjectParams,
  ExtractReferencesParams,
  VerifyProjectParams,
  AssistProjectParams,
  AssistProjectBody,
} from "@workspace/api-zod";
import {
  analyzeContent,
  extractReferences,
  verifyProject as runVerify,
  assist,
} from "../lib/ai";
import { serializeProject } from "../lib/serialize";

const router: IRouter = Router();

router.post("/projects/:id/analyze", async (req, res): Promise<void> => {
  const params = AnalyzeProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "المشروع غير موجود" });
    return;
  }

  const { analysis, sections } = await analyzeContent(project);

  const [updated] = await db
    .update(projectsTable)
    .set({ analysis, sections })
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  res.json(serializeProject(updated));
});

router.post("/projects/:id/references", async (req, res): Promise<void> => {
  const params = ExtractReferencesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "المشروع غير موجود" });
    return;
  }

  const references = await extractReferences(project);

  const [updated] = await db
    .update(projectsTable)
    .set({ references })
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  res.json(serializeProject(updated));
});

router.post("/projects/:id/verify", async (req, res): Promise<void> => {
  const params = VerifyProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "المشروع غير موجود" });
    return;
  }

  const verification = await runVerify(project);

  const [updated] = await db
    .update(projectsTable)
    .set({ verification, readinessScore: verification.readinessScore })
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  res.json(serializeProject(updated));
});

router.post("/projects/:id/assist", async (req, res): Promise<void> => {
  const params = AssistProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AssistProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "المشروع غير موجود" });
    return;
  }

  const result = await assist(
    project,
    parsed.data.action,
    parsed.data.instructions,
    parsed.data.context,
  );

  res.json(result);
});

export default router;
