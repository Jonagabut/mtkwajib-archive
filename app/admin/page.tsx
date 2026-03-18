// app/admin/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminLoginForm from "./LoginForm";

export const dynamic  = "force-dynamic"; // REQUIRED — cookies() needs dynamic context
export const metadata = { title: "Admin — MTK Wajib Archive", robots: "noindex,nofollow" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect("/admin/dashboard");

  return (
    <main
      className="min-h-[100dvh] bg-void flex items-center justify-center px-4"
      style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}
    >
      <AdminLoginForm />
    </main>
  );
}
