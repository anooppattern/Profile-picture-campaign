import { NextRequest, NextResponse } from "next/server";
import { deleteTemplate, toggleTemplate, updateTemplate } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";
import { getTemplates } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const templateId = parseInt(id);

  // Find the template to get filename for cleanup
  const templates = getTemplates(false);
  const template = templates.find((t) => t.id === templateId);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Delete file
  const filePath = path.join(process.cwd(), "public", "uploads", "templates", template.filename);
  try {
    await unlink(filePath);
  } catch {
    // File may already be deleted
  }

  deleteTemplate(templateId);
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const templateId = parseInt(id);
  const body = await request.json();

  if (body.toggle) {
    const template = toggleTemplate(templateId);
    return NextResponse.json(template);
  }

  const template = updateTemplate(templateId, body);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json(template);
}
