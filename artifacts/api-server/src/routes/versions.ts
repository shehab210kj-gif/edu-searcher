import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import {
  db,
  projectsTable,
  documentVersionsTable,
  type DocumentSnapshot,
} from "@workspace/db";
import {
  ListProjectVersionsParams,
  CreateProjectVersionParams,
  CreateProjectVersionBody,
  RestoreProjectVersionParams,
} from "@workspace/api-zod";
import {
  serializeDocumentVersion,
  serializeProject,
} from "../lib/serialize";

const router: IRouter = Router();

router.get("/projects/:id/versions", async (req, res): Promise<void> => {
  const params = ListProjectVersionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "المشروع غير موجود" });
    return;
  }

  const rows = await db
    .select()
    .from(documentVersionsTable)
    .where(eq(documentVersionsTable.projectId, params.data.id))
    .orderBy(desc(documentVersionsTable.createdAt));
  res.json(rows.map(serializeDocumentVersion));
});

router.post("/projects/:id/versions", async (req, res): Promise<void> => {
  const params = CreateProjectVersionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateProjectVersionBody.safeParse(req.body ?? {});
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

  const snapshot: DocumentSnapshot = {
    title: project.title,
    richContent: project.richContent ?? "",
    layoutMetadata: project.layoutMetadata ?? {},
    formatting: project.formatting,
  };

  const [version] = await db
    .insert(documentVersionsTable)
    .values({
      projectId: project.id,
      label: parsed.data.label ?? "",
      snapshot,
    })
    .returning();

  res.status(201).json(serializeDocumentVersion(version));
});

router.post(
  "/projects/:id/versions/:versionId/restore",
  async (req, res): Promise<void> => {
    const params = RestoreProjectVersionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [version] = await db
      .select()
      .from(documentVersionsTable)
      .where(
        and(
          eq(documentVersionsTable.id, params.data.versionId),
          eq(documentVersionsTable.projectId, params.data.id),
        ),
      );
    if (!version) {
      res.status(404).json({ error: "النسخة غير موجودة" });
      return;
    }

    const snap = version.snapshot;
    const [project] = await db
      .update(projectsTable)
      .set({
        title: snap.title ?? undefined,
        richContent: snap.richContent ?? null,
        layoutMetadata: snap.layoutMetadata ?? null,
        formatting: snap.formatting ?? undefined,
      })
      .where(eq(projectsTable.id, params.data.id))
      .returning();

    if (!project) {
      res.status(404).json({ error: "المشروع غير موجود" });
      return;
    }

    res.json(serializeProject(project));
  },
);

export default router;
