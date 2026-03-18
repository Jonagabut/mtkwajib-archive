"use server";
// app/actions/auth.ts
import { redirect } from "next/navigation";
import { checkCredentials, createSession, destroySession } from "@/lib/auth";

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const username = (formData.get("username") as string)?.trim();
  const password = (formData.get("password") as string) ?? "";

  if (!username || !password) {
    return { error: "Username dan password wajib diisi." };
  }

  if (!checkCredentials(username, password)) {
    // Intentional delay to slow brute-force attempts
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Username atau password salah." };
  }

  await createSession(username);
  redirect("/admin/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin");
}
