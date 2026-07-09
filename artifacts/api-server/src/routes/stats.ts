import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  // Use SQL aggregations instead of loading all projects into memory
  const [counts] = await db
    .select({
      totalProjects: sql<number>`count(*)::int`,
      avgReadiness: sql<number>`coalesce(round(avg(${projectsTable.readinessScore}) filter (where ${projectsTable.readinessScore} is not null))::int, 0)`,
      completedProjects: sql<number>`count(*) filter (where ${projectsTable.readinessScore} >= 80)::int`,
    })
    .from(projectsTable);

  const byWorkTypeRows = await db
    .select({
      workType: projectsTable.workType,
      count: sql<number>`count(*)::int`,
    })
    .from(projectsTable)
    .groupBy(projectsTable.workType);

  const byWorkType = byWorkTypeRows.map((r) => ({
    workType: r.workType,
    count: r.count,
  }));

  // Only select lightweight summary columns for recent projects
  const recent = await db
    .select({
      id: projectsTable.id,
      title: projectsTable.title,
      workType: projectsTable.workType,
      citationStyle: projectsTable.citationStyle,
      language: projectsTable.language,
      readinessScore: projectsTable.readinessScore,
      createdAt: projectsTable.createdAt,
      updatedAt: projectsTable.updatedAt,
    })
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt))
    .limit(5);

  const recentProjects = recent.map((p) => ({
    id: p.id,
    title: p.title,
    workType: p.workType,
    citationStyle: p.citationStyle,
    language: p.language,
    readinessScore: p.readinessScore,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  res.json({
    totalProjects: counts.totalProjects,
    avgReadiness: counts.avgReadiness,
    completedProjects: counts.completedProjects,
    byWorkType,
    recentProjects,
  });
});

export default router;
