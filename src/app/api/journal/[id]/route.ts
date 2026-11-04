export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, notFound, serverError } from "@/lib/api";
import { JournalEntry } from "@/models/JournalEntry";
import { journalSchema } from "@/lib/validations";

/** The [id] segment is the journal entry's local date (YYYY-MM-DD). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const entry = await JournalEntry.findOne({ userId: auth.userId, date: params.id }).lean();
    if (!entry) return notFound("Journal entry not found.");
    return NextResponse.json(entry);
  } catch (err) {
    return serverError(err, "Failed to load journal entry.");
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const parsed = journalSchema.partial().safeParse({ ...body, date: params.id });
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message || "Invalid input");
    }
    const { date, ...rest } = parsed.data;
    const entry = await JournalEntry.findOneAndUpdate(
      { userId: auth.userId, date: params.id },
      { $set: rest },
      { new: true }
    );
    if (!entry) return notFound("Journal entry not found.");
    return NextResponse.json(entry);
  } catch (err) {
    return serverError(err, "Failed to update journal entry.");
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const entry = await JournalEntry.findOneAndDelete({ userId: auth.userId, date: params.id });
    if (!entry) return notFound("Journal entry not found.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "Failed to delete journal entry.");
  }
}
