import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata = { title: "Sign in — CompanyHub" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/3 size-[420px] rounded-full bg-lime/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 size-[320px] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center">
          <Logo size={36} />
        </Link>
        <Suspense>
          <AuthCard />
        </Suspense>
      </div>
    </div>
  );
}
