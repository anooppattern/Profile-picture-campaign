import { NextRequest, NextResponse } from "next/server";
import { getTemplates, addTemplate } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const showAll = request.nextUrl.searchParams.get("all") === "true";
  const templates = getTemplates(!showAll);
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string;
  const category = (formData.get("category") as string) || "general";

  if (!file || !name) {
    return NextResponse.json({ error: "File and name are required" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".png";
  const filename = `${uuidv4()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "templates");
  const filePath = path.join(uploadDir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const template = addTemplate(name, filename, category);
  return NextResponse.json(template, { status: 201 });
}
