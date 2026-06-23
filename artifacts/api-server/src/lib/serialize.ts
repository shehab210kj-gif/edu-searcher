import type {
  Project,
  Template,
  LibraryDocument,
  LibraryCategory,
  DocumentVersion,
} from "@workspace/db";

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
    sourceLibraryDocumentId: p.sourceLibraryDocumentId ?? null,
    richContent: p.richContent ?? null,
    layoutMetadata: p.layoutMetadata ?? null,
    documentMode: p.documentMode,
    templateContent: p.templateContent ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeLibraryDocument(d: LibraryDocument) {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    documentType: d.documentType,
    coverImageUrl: d.coverImageUrl,
    university: d.university,
    degreeLevel: d.degreeLevel,
    department: d.department,
    category: d.category,
    language: d.language,
    tags: d.tags,
    fileType: d.fileType,
    pageCount: d.pageCount ?? null,
    originalFileName: d.originalFileName,
    originalFileUrl: d.originalFileUrl,
    richContent: d.richContent,
    layoutMetadata: d.layoutMetadata,
    formatting: d.formatting ?? null,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export function serializeLibraryDocumentSummary(d: LibraryDocument) {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    documentType: d.documentType,
    coverImageUrl: d.coverImageUrl,
    university: d.university,
    degreeLevel: d.degreeLevel,
    department: d.department,
    category: d.category,
    language: d.language,
    tags: d.tags,
    fileType: d.fileType,
    pageCount: d.pageCount ?? null,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export function serializeLibraryCategory(c: LibraryCategory) {
  return {
    id: c.id,
    kind: c.kind,
    name: c.name,
    createdAt: c.createdAt.toISOString(),
  };
}

export function serializeDocumentVersion(v: DocumentVersion) {
  return {
    id: v.id,
    projectId: v.projectId,
    label: v.label,
    snapshot: v.snapshot,
    createdAt: v.createdAt.toISOString(),
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
