import { NextRequest, NextResponse } from "next/server";
import { postCampfire } from "@/lib/basecamp";
import { formatISTDateLong, formatISTTimeShort, nowIST } from "@/lib/time";

export const dynamic = "force-dynamic";

function normalizeAnnouncement(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .map((line) => line.replace(/\s+/g, " ").trim());

  const cleaned: string[] = [];
  let previousBlank = false;

  for (const line of lines) {
    const isBlank = line.length === 0;
    if (isBlank && previousBlank) continue;
    cleaned.push(line);
    previousBlank = isBlank;
  }

  while (cleaned.length > 0 && cleaned[0] === "") cleaned.shift();
  while (cleaned.length > 0 && cleaned[cleaned.length - 1] === "") cleaned.pop();

  return cleaned;
}

function buildAnnouncementMessage(contentLines: string[]): string {
  const now = nowIST();
  const timestamp = `${formatISTDateLong(now)} · ${formatISTTimeShort(now)} IST`;

  return [
    "📣 Admin Announcement",
    `When: ${timestamp}`,
    "",
    ...contentLines,
    "",
    "_Sent via INSYDE Admin Dashboard_",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message : "";

    if (!message.trim()) {
      return NextResponse.json({ error: "Announcement message is required." }, { status: 400 });
    }

    if (message.length > 2500) {
      return NextResponse.json({ error: "Announcement is too long. Keep it under 2500 characters." }, { status: 400 });
    }

    const normalizedLines = normalizeAnnouncement(message);
    if (!normalizedLines.length) {
      return NextResponse.json({ error: "Announcement message is empty after formatting cleanup." }, { status: 400 });
    }

    const formattedMessage = buildAnnouncementMessage(normalizedLines);
    await postCampfire(formattedMessage);

    return NextResponse.json({
      ok: true,
      formattedMessage,
      lineCount: normalizedLines.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send announcement to Basecamp.",
      },
      { status: 500 }
    );
  }
}
