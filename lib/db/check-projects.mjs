import pg from "pg";

const DATABASE_URL = "postgresql://postgres.udbptrzbqylazbremhxl:y2SGBnUb9CEu1vYo@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  const res = await client.query('SELECT id, title, formatting, layout_metadata FROM projects ORDER BY id DESC LIMIT 5');
  console.log("=== LATEST 5 PROJECTS IN DB ===");
  for (const row of res.rows) {
    console.log(`\nID: ${row.id}`);
    console.log(`Title: ${row.title}`);
    console.log(`Formatting:`, JSON.stringify(row.formatting));
    console.log(`Layout Metadata:`, JSON.stringify(row.layout_metadata));
  }

  await client.end();
}

main().catch(console.error);
