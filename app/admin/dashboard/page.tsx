// app/admin/dashboard/page.tsx — Full admin panel
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getAllStudents, getAllMedia, getAllConfessions,
  getDashboardStats, getSiteConfig,
} from "@/app/actions/admin";
import AdminDashboard from "./AdminDashboard";

export const metadata = { title: "Dashboard Admin — MTK Wajib", robots: "noindex" };
export const dynamic = "force-dynamic"; // always fresh, never cached

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin");

  // Parallel fetch everything for dashboard
  const [stats, students, media, confessions, config] = await Promise.all([
    getDashboardStats(),
    getAllStudents(),
    getAllMedia(),
    getAllConfessions(),
    getSiteConfig(),
  ]);

  return (
    <AdminDashboard
      username={session.username}
      stats={stats}
      initialStudents={students}
      initialMedia={media}
      initialConfessions={confessions}
      siteConfig={config}
    />
  );
}
