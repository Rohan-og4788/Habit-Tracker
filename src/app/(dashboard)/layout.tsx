import { redirect } from "next/navigation";
import { readSessionCookie, validateSession } from "@/lib/session";
import dbConnect from "@/lib/database";
import { cookies } from "next/headers";
import DashboardShell from "@/components/layout/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await dbConnect();
  const cookieStore = cookies();
  const token = cookieStore.get("hf_session")?.value;
  if (!token) {
    redirect("/auth/login");
  }
  const session = await validateSession(token);
  if (!session) {
    redirect("/auth/login");
  }

  return (
    <DashboardShell user={session.user as any}>
      {children}
    </DashboardShell>
  );
}
