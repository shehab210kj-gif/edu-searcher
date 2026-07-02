import { db, projectsTable } from "@workspace/db";
import { defaultFormatting } from "./src/lib/formatting.js";

async function main() {
  console.log("Inserting project via Drizzle...");
  const [project] = await db
    .insert(projectsTable)
    .values({
      title: "دريزل تست",
      workType: "Graduation Project",
      citationStyle: "APA 7",
      language: "العربية",
      rawContent: "نص",
      formatting: defaultFormatting,
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
        cover: {
          title: "دريزل تست",
          university: "جامعة الملك سعود"
        }
      }
    })
    .returning();

  console.log("Inserted project:", JSON.stringify(project));
  process.exit(0);
}

main().catch(console.error);
