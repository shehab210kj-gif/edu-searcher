/**
 * seed.mjs
 * Run with: node lib/db/seed.mjs
 * Seeds the Supabase database with default library documents and categories.
 */

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

const LIBRARY_CATEGORIES = [
  // Categories
  { kind: "category", name: "بحوث التخرج" },
  { kind: "category", name: "رسائل ماجستير" },
  { kind: "category", name: "أطروحات دكتوراه" },
  { kind: "category", name: "أوراق علمية" },
  // Universities
  { kind: "university", name: "جامعة الملك سعود" },
  { kind: "university", name: "جامعة الملك عبدالعزيز" },
  { kind: "university", name: "جامعة أم القرى" },
  // Departments
  { kind: "department", name: "إدارة الأعمال" },
  { kind: "department", name: "علوم الحاسب" },
  { kind: "department", name: "الهندسة" }
];

const LIBRARY_DOCUMENTS = [
  {
    title: "قالب مشروع تخرج إدارة الأعمال الموحد",
    description: "القالب الأكاديمي الرسمي المعتمد لمشاريع تخرج بكالوريوس إدارة الأعمال، يحتوي على الهيكل والتنسيق الافتراضي الكامل.",
    document_type: "master_template",
    university: "جامعة الملك سعود",
    degree_level: "بكالوريوس",
    department: "إدارة الأعمال",
    category: "بحوث التخرج",
    language: "ar",
    tags: '{"قالب", "مشروع تخرج", "إدارة"}',
    file_type: "docx",
    is_template: true,
    status: "published",
    rich_content: `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"عنوان مشروع التخرج الأكاديمي"}]},{"type":"paragraph","content":[{"type":"text","text":"هذا هو قالب مشروع التخرج المعتمد لقسم إدارة الأعمال بكلية إدارة الأعمال بجامعة الملك سعود..."}]}]}`,
    layout_metadata: JSON.stringify({
      showPageNumbers: true,
      pageNumberFormat: "1, 2, 3",
      pageNumberAlign: "center",
      pageSetup: { size: "A4", orientation: "portrait", marginTop: 2.5, marginBottom: 2.5, marginLeft: 2.5, marginRight: 3 }
    })
  },
  {
    title: "نموذج مقترح بحثي (Research Proposal Blueprint)",
    description: "نموذج متكامل لتصميم خطة أو مقترح بحث علمي لرسائل الماجستير والدكتوراه وفقاً لمنهجية APA 7.",
    document_type: "journal_template",
    university: "جامعة أم القرى",
    degree_level: "ماجستير",
    department: "علوم الحاسب",
    category: "رسائل ماجستير",
    language: "ar",
    tags: '{"خطة بحث", "ماجستير", "مقترح"}',
    file_type: "docx",
    is_template: true,
    status: "published",
    rich_content: `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"مقترح البحث العلمي"}]},{"type":"paragraph","content":[{"type":"text","text":"يشتمل هذا النموذج على الأجزاء الأساسية للمقترح البحثي: مشكلة البحث، الأهداف، الفرضيات، والمنهجية..."}]}]}`,
    layout_metadata: JSON.stringify({
      showPageNumbers: true,
      pageNumberFormat: "1, 2, 3",
      pageNumberAlign: "center",
      pageSetup: { size: "A4", orientation: "portrait", marginTop: 2.5, marginBottom: 2.5, marginLeft: 2.5, marginRight: 2.5 }
    })
  },
  {
    title: "أثر الذكاء الاصطناعي في إدارة الموارد البشرية",
    description: "دراسة تطبيقية محكمة تبحث في دور تقنيات الذكاء الاصطناعي وتأثيرها على استقطاب وتدريب الكفاءات في المؤسسات الحكومية.",
    document_type: "previous_research",
    university: "جامعة الملك عبدالعزيز",
    degree_level: "ماجستير",
    department: "إدارة الأعمال",
    category: "رسائل ماجستير",
    language: "ar",
    tags: '{"ذكاء اصطناعي", "موارد بشرية", "دراسة حالة"}',
    file_type: "docx",
    is_template: false,
    status: "published",
    rich_content: `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"أثر الذكاء الاصطناعي على الموارد البشرية"}]},{"type":"paragraph","content":[{"type":"text","text":"تبحث هذه الورقة في التطورات التكنولوجية الأخيرة وتأثيرها على كفاءة الموارد البشرية..."}]}]}`,
    layout_metadata: JSON.stringify({
      showPageNumbers: true,
      pageNumberFormat: "1, 2, 3",
      pageNumberAlign: "center",
      pageSetup: { size: "A4", orientation: "portrait", marginTop: 2.5, marginBottom: 2.5, marginLeft: 2.5, marginRight: 3 }
    })
  }
];

async function main() {
  await client.connect();
  console.log("Connected to Supabase to seed database...");

  // Seed Categories
  console.log("Seeding library categories...");
  for (const cat of LIBRARY_CATEGORIES) {
    const checkRes = await client.query(
      `SELECT id FROM library_categories WHERE kind = $1 AND name = $2`,
      [cat.kind, cat.name]
    );
    if (checkRes.rows.length === 0) {
      await client.query(
        `INSERT INTO library_categories (kind, name) VALUES ($1, $2)`,
        [cat.kind, cat.name]
      );
      console.log(`  ✓ Inserted category: [${cat.kind}] ${cat.name}`);
    }
  }

  // Seed Documents
  console.log("Seeding library documents...");
  for (const doc of LIBRARY_DOCUMENTS) {
    const checkRes = await client.query(
      `SELECT id FROM library_documents WHERE title = $1`,
      [doc.title]
    );
    if (checkRes.rows.length === 0) {
      await client.query(
        `INSERT INTO library_documents (
          title, description, document_type, work_type, university, degree_level, 
          department, category, language, tags, file_type, is_template, 
          status, rich_content, layout_metadata, formatting
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          doc.title, doc.description, doc.document_type, doc.category, doc.university, doc.degree_level,
          doc.department, doc.category, doc.language, doc.tags, doc.file_type, doc.is_template,
          doc.status, doc.rich_content, doc.layout_metadata, '{}'
        ]
      );
      console.log(`  ✓ Inserted document: ${doc.title}`);
    }
  }

  console.log("\n🎉 Database seeded successfully!\n");
  await client.end();
  process.exit(0);
}

main().catch(e => {
  console.error("❌ Seeding failed:", e.message);
  process.exit(1);
});
