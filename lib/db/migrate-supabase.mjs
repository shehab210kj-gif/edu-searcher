/**
 * migrate-supabase.mjs
 * Run with: node lib/db/migrate-supabase.mjs
 * Creates/updates ALL tables needed by this project using raw SQL (CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS).
 */

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function run(label, sql) {
  try {
    await client.query(sql);
    console.log(`  ✓ ${label}`);
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message}`);
  }
}

async function main() {
  await client.connect();
  console.log("✅ Connected to Supabase!\n");

  // ─────────────────────────────────────────
  // 1. projects
  // ─────────────────────────────────────────
  console.log("📦 Table: projects");
  await run("create projects table", `
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      work_type TEXT NOT NULL,
      citation_style TEXT NOT NULL,
      language TEXT NOT NULL,
      template_id INTEGER,
      raw_content TEXT NOT NULL DEFAULT '',
      sections JSONB NOT NULL DEFAULT '[]',
      refs JSONB NOT NULL DEFAULT '[]',
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
    );
  `);

  // Add any missing columns to existing projects table
  const projectCols = [
    ["refs", "JSONB NOT NULL DEFAULT '[]'"],
    ["rich_content", "TEXT"],
    ["layout_metadata", "JSONB"],
    ["document_mode", "TEXT NOT NULL DEFAULT 'AI_GENERATED'"],
    ["template_file_url", "TEXT"],
    ["template_content", "JSONB"],
    ["source_library_document_id", "INTEGER"],
    ["readiness_score", "INTEGER"],
    ["verification", "JSONB"],
    ["analysis", "JSONB"],
  ];
  for (const [col, def] of projectCols) {
    await run(`add column projects.${col} if missing`, `ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${col} ${def};`);
  }

  // ─────────────────────────────────────────
  // 2. templates
  // ─────────────────────────────────────────
  console.log("\n📦 Table: templates");
  await run("create templates table", `
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      citation_style TEXT NOT NULL DEFAULT 'APA',
      is_builtin BOOLEAN NOT NULL DEFAULT TRUE,
      formatting JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await run("add category col", `ALTER TABLE templates ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';`);
  await run("add description col", `ALTER TABLE templates ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';`);
  await run("add is_builtin col", `ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_builtin BOOLEAN NOT NULL DEFAULT TRUE;`);

  // ─────────────────────────────────────────
  // 3. library_documents
  // ─────────────────────────────────────────
  console.log("\n📦 Table: library_documents");
  await run("create library_documents table", `
    CREATE TABLE IF NOT EXISTS library_documents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      document_type TEXT NOT NULL DEFAULT 'master_template',
      cover_image_url TEXT,
      university TEXT,
      degree_level TEXT,
      department TEXT,
      category TEXT,
      language TEXT NOT NULL DEFAULT 'ar',
      tags JSONB NOT NULL DEFAULT '[]',
      original_file_name TEXT,
      original_file_url TEXT,
      file_type TEXT NOT NULL DEFAULT 'docx',
      page_count INTEGER,
      rich_content TEXT NOT NULL DEFAULT '',
      layout_metadata JSONB NOT NULL DEFAULT '{}',
      formatting JSONB,
      is_template BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  const libCols = [
    ["description", "TEXT NOT NULL DEFAULT ''"],
    ["document_type", "TEXT NOT NULL DEFAULT 'master_template'"],
    ["cover_image_url", "TEXT"],
    ["degree_level", "TEXT"],
    ["department", "TEXT"],
    ["category", "TEXT"],
    ["original_file_name", "TEXT"],
    ["original_file_url", "TEXT"],
    ["file_type", "TEXT NOT NULL DEFAULT 'docx'"],
    ["page_count", "INTEGER"],
    ["rich_content", "TEXT NOT NULL DEFAULT ''"],
    ["layout_metadata", "JSONB NOT NULL DEFAULT '{}'"],
    ["is_template", "BOOLEAN NOT NULL DEFAULT FALSE"],
    ["status", "TEXT NOT NULL DEFAULT 'published'"],
    ["tags", "JSONB NOT NULL DEFAULT '[]'"],
    ["updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"],
  ];
  for (const [col, def] of libCols) {
    await run(`add library_documents.${col}`, `ALTER TABLE library_documents ADD COLUMN IF NOT EXISTS ${col} ${def};`);
  }

  // ─────────────────────────────────────────
  // 4. library_categories
  // ─────────────────────────────────────────
  console.log("\n📦 Table: library_categories");
  await run("create library_categories table", `
    CREATE TABLE IF NOT EXISTS library_categories (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'category',
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ─────────────────────────────────────────
  // 5. document_versions
  // ─────────────────────────────────────────
  console.log("\n📦 Table: document_versions");
  await run("create document_versions table", `
    CREATE TABLE IF NOT EXISTS document_versions (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT '',
      snapshot JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ─────────────────────────────────────────
  // 6. crm_orders
  // ─────────────────────────────────────────
  console.log("\n📦 Table: crm_orders");
  await run("create crm_orders table", `
    CREATE TABLE IF NOT EXISTS crm_orders (
      id SERIAL PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_email TEXT,
      client_phone TEXT,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      work_type TEXT NOT NULL,
      university TEXT,
      price NUMERIC(10, 2),
      payment_status TEXT NOT NULL DEFAULT 'pending',
      delivery_status TEXT NOT NULL DEFAULT 'new',
      assigned_to TEXT,
      notes TEXT,
      due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  const crmCols = [
    ["client_email", "TEXT"],
    ["client_phone", "TEXT"],
    ["project_id", "INTEGER"],
    ["university", "TEXT"],
    ["price", "NUMERIC(10,2)"],
    ["payment_status", "TEXT NOT NULL DEFAULT 'pending'"],
    ["delivery_status", "TEXT NOT NULL DEFAULT 'new'"],
    ["assigned_to", "TEXT"],
    ["notes", "TEXT"],
    ["due_date", "TIMESTAMPTZ"],
    ["updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"],
  ];
  for (const [col, def] of crmCols) {
    await run(`add crm_orders.${col}`, `ALTER TABLE crm_orders ADD COLUMN IF NOT EXISTS ${col} ${def};`);
  }

  // ─────────────────────────────────────────
  // 7. crm_team_members
  // ─────────────────────────────────────────
  console.log("\n📦 Table: crm_team_members");
  await run("create crm_team_members table", `
    CREATE TABLE IF NOT EXISTS crm_team_members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'writer',
      specialization TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("\n🎉 Migration complete! All tables are ready.\n");
  await client.end();
  process.exit(0);
}

main().catch(e => {
  console.error("\n❌ Migration failed:", e.message);
  process.exit(1);
});
