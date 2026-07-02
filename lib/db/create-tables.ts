import { db, projectsTable } from "./src/index.ts";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating tables via drizzle ORM...");
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      work_type TEXT NOT NULL,
      citation_style TEXT NOT NULL,
      language TEXT NOT NULL,
      template_id INTEGER,
      raw_content TEXT NOT NULL DEFAULT '',
      sections JSONB NOT NULL DEFAULT '[]',
      references JSONB NOT NULL DEFAULT '[]',
      formatting JSONB NOT NULL DEFAULT '{}',
      analysis JSONB,
      verification JSONB,
      readiness_score INTEGER,
      source_library_document_id INTEGER,
      rich_content TEXT,
      layout_metadata JSONB,
      document_mode TEXT NOT NULL DEFAULT 'AI_GENERATED',
      template_file_url TEXT,
      template_content JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      university TEXT,
      faculty TEXT,
      specialization TEXT,
      academic_level TEXT,
      citation_style TEXT NOT NULL DEFAULT 'APA',
      formatting JSONB NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS library_documents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      university TEXT,
      faculty TEXT,
      department TEXT,
      year INTEGER,
      work_type TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'Arabic',
      tags TEXT[] DEFAULT '{}',
      file_url TEXT,
      file_size INTEGER,
      page_count INTEGER,
      formatting JSONB NOT NULL DEFAULT '{}',
      rich_content TEXT,
      layout_metadata JSONB,
      is_template BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log("Tables created successfully!");
  process.exit(0);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
