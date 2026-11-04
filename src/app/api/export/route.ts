export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { exportUserData, exportHabitLogsCsv } from "@/services/export.service";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "json").toLowerCase();
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csv = await exportHabitLogsCsv(auth.userId);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="habitforge-logs-${stamp}.csv"`,
        },
      });
    }

    const data = await exportUserData(auth.userId);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="habitforge-export-${stamp}.json"`,
      },
    });
  } catch (err) {
    return serverError(err, "Failed to export data.");
  }
}
