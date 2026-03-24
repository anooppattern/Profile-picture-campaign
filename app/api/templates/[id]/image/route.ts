import { NextRequest, NextResponse } from "next/server";
import { getTemplateImage } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";
import { getTemplates } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const templateId = parseInt(id);

  // Try serving from DB first (works on Replit after redeploy)
  const dbImage = getTemplateImage(templateId);
  if (dbImage) {
    return new NextResponse(new Uint8Array(dbImage.data), {
      headers: {
        "Content-Type": dbImage.mime_type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Fallback: try filesystem (for older templates uploaded before DB storage)
  const templates = getTemplates(false);
  const template = templates.find((t) => t.id === templateId);
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), "public", "uploads", "templates", template.filename);
    const data = await readFile(filePath);
    const ext = path.extname(template.filename).toLowerCase();
    const mimeMap: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeMap[ext] || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
