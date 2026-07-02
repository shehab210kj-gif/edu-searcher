import pg from "pg";

const DATABASE_URL = "postgresql://postgres.udbptrzbqylazbremhxl:y2SGBnUb9CEu1vYo@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function main() {
  // Let's call the local API server to create a project
  const url = "http://localhost:5000/api/projects";
  const payload = {
    title: "بحث تجريبي للتأكد من الغلاف الأكاديمي",
    workType: "Graduation Project",
    citationStyle: "APA 7",
    language: "العربية",
    rawContent: "هذا النص التجريبي مخصص للتحقق من عمل صفحة الغلاف بالشكل الصحيح والمناسب لجامعة الملك سعود.",
    formatting: {
      fontFamily: "Traditional Arabic",
      fontSize: 14,
      headingSize: 18,
      subheadingSize: 16,
      lineSpacing: 1.5,
      paragraphAlign: "justify",
      firstLineIndent: 1.25
    },
    layoutMetadata: {
      showPageNumbers: true,
      pageNumberFormat: "1, 2, 3",
      pageNumberAlign: "center",
      pageSetup: {
        size: "A4",
        orientation: "portrait",
        marginTop: 2.5,
        marginBottom: 2.5,
        marginLeft: 2.5,
        marginRight: 3.0
      },
      coverPageHtml: `<div style="font-family:'Traditional Arabic';padding:30pt;direction:rtl;min-height:750pt;">
        <div style="text-align:right;font-size:11pt;line-height:1.6;margin-bottom:20pt;">
          <p style="margin:2pt 0;font-weight:bold;">جامعة الملك سعود</p>
          <p style="margin:2pt 0;">كلية إدارة الأعمال</p>
        </div>
        <div style="text-align:center;margin-top:80pt;">
          <h1 style="font-size:24pt;font-weight:bold;">بحث تجريبي للتأكد من الغلاف الأكاديمي</h1>
        </div>
      </div>`,
      cover: {
        title: "بحث تجريبي للتأكد من الغلاف الأكاديمي",
        university: "جامعة الملك سعود",
        faculty: "كلية إدارة الأعمال",
        studentName: "طالب تجريبي",
        supervisor: "مشرف تجريبي",
        degree: "بكالوريوس",
        year: "1447"
      }
    }
  };

  console.log("Sending POST to", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Response from server:", JSON.stringify(data));

    // Check database directly
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const dbRes = await client.query('SELECT id, title, layout_metadata FROM projects WHERE id = $1', [data.id]);
    console.log("Database entry for new project:", JSON.stringify(dbRes.rows[0]));
    await client.end();
  } catch (err) {
    console.error("Error connecting to server:", err.message);
  }
}

main().catch(console.error);
