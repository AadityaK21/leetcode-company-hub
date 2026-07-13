"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DifficultySpectrum } from "@/components/shared/difficulty-spectrum";
import { CompanyLogo } from "@/components/shared/company-logo";
import { formatNumber } from "@/lib/utils";

export interface HeroCompany {
  slug: string;
  name: string;
  logoUrl: string | null;
  totalQuestions: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

const TYPED = ["google", "amazon", "meta", "stripe", "microsoft", "netflix", "uber"];

export function Hero({
  companies,
  questionCount,
  companyCount = 656,
}: {
  companies: HeroCompany[];
  questionCount: number;
  companyCount?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [typed, setTyped] = React.useState(TYPED[0]);

  // Typewriter loop for the terminal demo line (skipped for reduced motion).
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let word = 0;
    let len = TYPED[0].length;
    let dir: 1 | -1 = -1;
    let pause = 18;
    const id = setInterval(() => {
      if (pause > 0) {
        pause--;
        return;
      }
      len += dir;
      const w = TYPED[word];
      if (len >= w.length) {
        len = w.length;
        dir = -1;
        pause = 16;
      } else if (len <= 0) {
        len = 0;
        dir = 1;
        word = (word + 1) % TYPED.length;
      }
      setTyped(TYPED[word].slice(0, len));
    }, 85);
    return () => clearInterval(id);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(query ? `/companies?q=${encodeURIComponent(query)}` : "/companies");
  }

  const top = companies[0];

  return (
    <section className="relative overflow-hidden">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/4 size-[520px] rounded-full bg-lime/15 blur-[130px]" />
        <div className="absolute -right-24 top-40 size-[400px] rounded-full bg-primary/10 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          }}
        />
        {/* watermark braces */}
        <span className="absolute -right-10 top-8 select-none font-mono text-[22rem] font-bold leading-none text-foreground/[0.035]">
          {"{}"}
        </span>
      </div>

      <div className="container grid items-center gap-14 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div>
          <p className="hero-enter eyebrow mb-6">
            <span className="text-lime">{"//"}</span> {formatNumber(questionCount)} questions ·{" "}
            {companyCount} companies · open data
          </p>

          {/* Editorial staggered headline */}
          <h1 className="font-display font-bold leading-[0.95] tracking-tight">
            <span className="hero-enter block text-5xl sm:text-7xl lg:text-[5.5rem]">
              the exact
            </span>
            <span
              className="hero-enter block bg-gradient-to-r from-primary to-lime bg-clip-text pb-1 pl-8 text-5xl text-transparent sm:pl-24 sm:text-7xl lg:text-[5.5rem]"
              style={{ animationDelay: "110ms" }}
            >
              questions
            </span>
            <span
              className="hero-enter block text-5xl sm:text-7xl lg:text-[5.5rem]"
              style={{ animationDelay: "220ms" }}
            >
              they&apos;ll ask.
            </span>
          </h1>

          <p
            className="hero-enter mt-6 max-w-md text-lg text-muted-foreground"
            style={{ animationDelay: "320ms" }}
          >
            Company-wise LeetCode questions ranked by real interview frequency — with progress,
            spaced revision, and curated sheets.
          </p>

          {/* Terminal search */}
          <form
            onSubmit={submit}
            className="hero-enter mt-8 max-w-lg overflow-hidden rounded-2xl bg-[hsl(158,26%,9%)] font-mono text-sm shadow-2xl ring-1 ring-black/30"
            style={{ animationDelay: "430ms" }}
          >
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-xs text-white/40">prep — bash</span>
            </div>
            <div className="space-y-2 px-4 py-4">
              <p className="text-white/85">
                <span className="text-lime">$</span> prep --company{" "}
                <span className="text-[#7ee2a8]">{typed}</span>
                <span className="caret-blink ml-px inline-block h-4 w-[7px] translate-y-[3px] bg-lime" />
              </p>
              {top && (
                <p className="text-white/40">
                  ↳ {formatNumber(top.totalQuestions)} questions · ranked by frequency
                </p>
              )}
              <label className="flex items-center gap-2 border-t border-white/10 pt-3 text-white/85">
                <span className="text-lime">$</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="type any company & press enter…"
                  aria-label="Search companies"
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                />
                <CornerDownLeft className="size-4 shrink-0 text-white/30" />
              </label>
            </div>
          </form>

          <div
            className="hero-enter mt-6 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "540ms" }}
          >
            <Button asChild variant="lime" size="lg">
              <Link href="/companies">
                Browse {companyCount} companies <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/sheets">Start with Blind 75</Link>
            </Button>
          </div>
        </div>

        {/* Floating company cards built from live data */}
        <div className="relative hidden h-[440px] lg:block" aria-hidden>
          {companies.slice(0, 3).map((company, i) => (
            <div
              key={company.slug}
              className="hero-enter absolute w-72 rounded-2xl border border-border/70 bg-card p-5 shadow-xl"
              style={{
                top: `${i * 128 + 10}px`,
                left: i % 2 === 0 ? "8%" : "38%",
                rotate: i === 1 ? "2deg" : "-2deg",
                animationDelay: `${350 + i * 140}ms`,
              }}
            >
              <div className="animate-float motion-reduce:animate-none" style={{ animationDelay: `${i * 1.3}s` }}>
                <div className="flex items-center gap-3">
                  <CompanyLogo name={company.name} logoUrl={company.logoUrl} size={40} />
                  <div>
                    <p className="font-display font-semibold">{company.name}</p>
                    <p className="figure text-xs text-muted-foreground">
                      {company.totalQuestions} questions tracked
                    </p>
                  </div>
                </div>
                <DifficultySpectrum
                  easy={company.easyCount}
                  medium={company.mediumCount}
                  hard={company.hardCount}
                  className="mt-4"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Company marquee */}
      <div className="border-t border-border/60 py-5" aria-hidden>
        <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="animate-marquee flex w-max items-center gap-12 motion-reduce:animate-none">
            {[...companies, ...companies].map((c, i) => (
              <span key={`${c.slug}-${i}`} className="flex items-center gap-2.5 opacity-55 transition-opacity hover:opacity-100">
                <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={24} />
                <span className="font-display text-sm font-semibold text-muted-foreground">
                  {c.name}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
