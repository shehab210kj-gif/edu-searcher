import pg from 'pg';

const url = "postgresql://postgres.udbptrzbqylazbremhxl:y2SGBnUb9CEu1vYo@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";
console.log("Connecting to:", url);

const client = new pg.Client({ 
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});
try {
  await client.connect();
  console.log("Connected successfully!");
  const res = await client.query("select * from templates;");
  console.log("Query success! Found templates count:", res.rowCount);
  console.log("Template rows:", res.rows);
} catch (err) {
  console.error("Database error occurred:", err);
} finally {
  await client.end();
}
