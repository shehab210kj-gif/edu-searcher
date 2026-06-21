import type { Project, Template } from "@workspace/db";

export function serializeProject(p: Project) {
  return {
    id: p.id,
    title: p.title,
    workType: p.workType,
    citationStyle: p.citationStyle,
    language: p.language,
    templateId: p.templateId,
    rawContent: p.rawContent,
    sections: p.sections,
    references: p.references,
    formatting: p.formatting,
    analysis: p.analysis ?? null,
    verification: p.verification ?? null,
    readinessScore: p.readinessScore,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeProjectSummary(p: Project) {
  return {
    id: p.id,
    title: p.title,
    workType: p.workType,
    citationStyle: p.citationStyle,
    language: p.language,
    readinessScore: p.readinessScore,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeTemplate(t: Template) {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    citationStyle: t.citationStyle,
    isBuiltin: t.isBuiltin,
    formatting: t.formatting,
    createdAt: t.createdAt.toISOString(),
  };
}
