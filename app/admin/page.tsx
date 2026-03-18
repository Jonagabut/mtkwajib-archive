// app/admin/page.tsx — Login page (hidden route, never linked publicly)
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminLoginForm from "./LoginForm";

export const metadata = { title: "Admin — MTK Wajib Archive", robots: "noindex" };

export default async function AdminLoginPage() {
  // Already logged in → go to dashboard
  const session = await getSession();
  if (session) redirect("/admin/dashboard");

  return (
    <main className="min-h-[100dvh] bg-void flex items-center justify-center px-4"
      style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}>
      <AdminLoginForm />
    </main>
  );
}
