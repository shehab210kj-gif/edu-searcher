import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import { serializeProjectSummary } from "../lib/serialize";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const all = await db.select().from(projectsTable);

  const totalProjects = all.length;
  const scored = all.filter((p) => p.readinessScore != null);
  const avgReadiness =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, p) => sum + (p.readinessScore ?? 0), 0) /
            scored.length,
        )
      : 0;
  const completedProjects = all.filter(
    (p) => (p.readinessScore ?? 0) >= 80,
  ).length;

  const byWorkTypeMap = new Map<string, number>();
  for (const p of all) {
    byWorkTypeMap.set(p.workType, (byWorkTypeMap.get(p.workType) ?? 0) + 1);
  }
  const byWorkType = Array.from(byWorkTypeMap.entries()).map(
    ([workType, count]) => ({ workType, count }),
  );

  const recent = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt))
    .limit(5);

  res.json({
    totalProjects,
    avgReadiness,
    completedProjects,
    byWorkType,
    recentProjects: recent.map(serializeProjectSummary),
  });
});

export default router;
