import fs from "fs/promises";
import path from "path";
import { db, libraryDocumentsTable } from "@workspace/db";
import { uploadBuffer } from "../lib/storage";
import { parseDocxToRich, extractPdfMetadata } from "../lib/documents";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

async function processFile(filePath: string, documentType: string, isTemplate: boolean, category: string | null) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".docx" && ext !== ".pdf") return; // skip other files
  
  const buffer = await fs.readFile(filePath);
  const fileName = path.basename(filePath);
  const mime = ext === ".pdf" ? PDF_MIME : DOCX_MIME;
  
  try {
    const originalFileUrl = await uploadBuffer(buffer, mime);
    
    let richContent = "";
    let layoutMetadata = {};
    let pageCount: number | null = null;
    let title = fileName.replace(ext, "");
    
    if (ext === ".pdf") {
      try {
        const meta = await extractPdfMetadata(buffer);
        if (meta.title) title = meta.title;
        pageCount = meta.pageCount;
      } catch (e) {
        console.warn(`Failed to parse PDF metadata for ${fileName}:`, e);
      }
    } else {
      try {
         const parsed = await parseDocxToRich(buffer);
         richContent = parsed.html;
         layoutMetadata = parsed.layout;
         if (parsed.title) title = parsed.title;
      } catch (e) {
         console.warn(`Failed to parse rich text for ${fileName}:`, e);
      }
    }
    
    await db.insert(libraryDocumentsTable).values({
      title,
      description: isTemplate ? "قالب غلاف جاهز للاستخدام" : "بحث/تلكيف مرفوع إلى المكتبة",
      documentType,
      workType: "research",
      fileType: ext === ".pdf" ? "pdf" : "docx",
      originalFileName: fileName,
      originalFileUrl,
      richContent,
      layoutMetadata,
      pageCount,
      isTemplate,
      status: "published",
      category,
      language: "ar",
    });
    console.log(`✅ Successfully imported: ${fileName}`);
  } catch (err) {
    console.error(`❌ Failed to import ${fileName}:`, err);
  }
}

async function processDirectory(dirPath: string, documentType: string, isTemplate: boolean, category: string | null = null) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // Use directory name as category for subdirectories
      await processDirectory(fullPath, documentType, isTemplate, entry.name);
    } else {
      await processFile(fullPath, documentType, isTemplate, category);
    }
  }
}

async function run() {
  console.log("Importing Downloads...");
  await processDirectory("C:\\\\Users\\\\CityLap\\\\Downloads\\\\Salaam-Alaikum\\\\Downloads", "previous_research", false);
  
  console.log("Importing الواجبات...");
  await processDirectory("C:\\\\Users\\\\CityLap\\\\Downloads\\\\Salaam-Alaikum\\\\الواجبات\\\\الواجبات", "previous_research", false);
  
  console.log("Importing صفحات غلاف...");
  await processDirectory("C:\\\\Users\\\\CityLap\\\\Downloads\\\\Salaam-Alaikum\\\\صفحات غلاف\\\\صفحات غلاف", "master_template", true);
  
  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
