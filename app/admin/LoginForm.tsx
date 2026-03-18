"use client";
// app/admin/LoginForm.tsx — React 18 / Next.js 14 compatible (useFormState)
import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { Loader2, Lock } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="btn-blue justify-center mt-1 disabled:opacity-60">
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
      {pending ? "Masuk..." : "Masuk"}
    </button>
  );
}

export default function AdminLoginForm() {
  const [state, formAction] = useFormState(loginAction, null);

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl
                        bg-blue/10 border border-blue/20 mb-4">
          <Lock size={20} className="text-blue" />
        </div>
        <h1 className="font-display text-2xl text-ink">Admin Panel</h1>
        <p className="font-mono text-[11px] text-muted mt-1 tracking-widest">
          MTK WAJIB ARCHIVE
        </p>
      </div>

      <div className="card-glass p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label className="block font-mono text-[11px] text-muted mb-1.5">USERNAME</label>
            <input
              name="username" type="text" placeholder="username" required
              autoComplete="username" autoCapitalize="none" spellCheck={false}
              className="input-dark font-mono"
            />
          </div>
          <div>
            <label className="block font-mono text-[11px] text-muted mb-1.5">PASSWORD</label>
            <input
              name="password" type="password" placeholder="••••••••" required
              autoComplete="current-password"
              className="input-dark font-mono"
            />
          </div>

          {state?.error && (
            <p className="text-coral text-sm bg-coral/10 rounded-lg px-3 py-2 flex items-center gap-2">
              <span>⚠</span>{state.error}
            </p>
          )}

          <SubmitButton />
        </form>
      </div>

      <p className="text-center font-mono text-[10px] text-muted/30 mt-6">
        Halaman ini tidak terindeks oleh search engine.
      </p>
    </div>
  );
}
