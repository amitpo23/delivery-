import type { ReactNode } from "react";
import Link from "next/link";
import { Package, ShieldCheck, Clock } from "lucide-react";

export interface SplitStep {
  num: number;
  name: string;
  est?: string;
}

interface SplitShellProps {
  step: number;
  steps: SplitStep[];
  panelEyebrow?: string;
  panelTitle: ReactNode;
  panelLede?: ReactNode;
  panelTrust?: { icon: typeof ShieldCheck; text: string }[];
  panelExtra?: ReactNode;
  brandName?: string;
  brandTagline?: string;
  topRight?: ReactNode;
  children: ReactNode;
}

const DEFAULT_TRUST = [
  { icon: ShieldCheck, text: "תשלום מאובטח" },
  { icon: Package, text: "ביטוח עד 1,000 ₪" },
  { icon: Clock, text: "מעקב חי" },
];

/**
 * Two-column split shell: navy panel (RTL: right) + form pane (left).
 * Stacks vertically on mobile (panel on top, form below).
 *
 * Used as the layout primitive for booking, signup, and checkout flows
 * that share the Split brand language.
 */
export function SplitShell({
  step,
  steps,
  panelEyebrow,
  panelTitle,
  panelLede,
  panelTrust = DEFAULT_TRUST,
  panelExtra,
  brandName = "אליהב כהן",
  brandTagline = "פודגרופ ומשלוחים",
  topRight,
  children,
}: SplitShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(420px,1fr)_1.15fr]">
      {/* ────────── BLUE PANEL ────────── */}
      <aside className="relative flex flex-col gap-7 overflow-hidden bg-navy px-6 py-8 text-sky-tint sm:px-12 sm:py-10 lg:gap-8">
        {/* atmospheric background layers */}
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            backgroundImage: `
              radial-gradient(1200px 600px at 100% 0%, rgba(79, 138, 255, 0.30), transparent 55%),
              radial-gradient(900px 700px at 0% 100%, rgba(30, 99, 242, 0.28), transparent 60%),
              linear-gradient(180deg, #0A2540 0%, #102E55 100%)
            `,
          }}
        />
        {/* dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
          }}
        />
        {/* corner glow */}
        <div
          className="pointer-events-none absolute -bottom-44 -left-44 h-[420px] w-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(79,138,255,0.40), transparent 70%)",
          }}
        />

        {/* brand */}
        <Link
          href="/"
          className="relative z-10 flex items-center gap-3 text-white"
        >
          <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-white text-lg font-extrabold tracking-tight text-navy shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
            {brandName.charAt(0)}
          </div>
          <div className="leading-tight">
            <div className="text-base font-extrabold tracking-tight text-white">
              {brandName}
            </div>
            <div className="text-[13px] font-medium text-sky">{brandTagline}</div>
          </div>
        </Link>

        {/* eyebrow chip */}
        {panelEyebrow && (
          <span className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-[13px] font-semibold text-sky">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-2 shadow-[0_0_0_4px_rgba(79,138,255,0.22)]" />
            {panelEyebrow}
          </span>
        )}

        {/* title */}
        <h1 className="relative z-10 m-0 text-[clamp(2.25rem,4.4vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.025em] text-white">
          {panelTitle}
        </h1>

        {/* lede */}
        {panelLede && (
          <p className="relative z-10 m-0 max-w-[46ch] text-[17px] leading-[1.65] text-[#C7D5EC]">
            {panelLede}
          </p>
        )}

        {/* extra slot (e.g. coverage list) */}
        {panelExtra && <div className="relative z-10">{panelExtra}</div>}

        {/* vertical stepper */}
        <div className="relative z-10 mt-auto grid gap-2.5">
          {steps.map((s) => {
            const isActive = s.num === step;
            const isDone = s.num < step;
            return (
              <div
                key={s.num}
                className={[
                  "grid grid-cols-[28px_1fr_auto] items-center gap-3.5 border-b border-white/10 py-3 transition-colors last:border-b-0",
                  isActive ? "" : "text-white/60",
                ].join(" ")}
              >
                <div
                  className={[
                    "grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-all",
                    isActive
                      ? "bg-blue text-white shadow-[0_0_0_4px_rgba(30,99,242,0.30)]"
                      : isDone
                      ? "bg-blue-2 text-white"
                      : "bg-white/8 text-sky",
                  ].join(" ")}
                >
                  {isDone ? "✓" : s.num}
                </div>
                <div
                  className={[
                    "text-[15px] font-semibold",
                    isActive ? "text-white" : "text-white/75",
                  ].join(" ")}
                >
                  {s.name}
                </div>
                {s.est && (
                  <div
                    className={[
                      "text-xs font-medium",
                      isActive ? "text-blue-2" : "text-white/45",
                    ].join(" ")}
                  >
                    {s.est}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* trust badges */}
        <div className="relative z-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[12.5px] font-medium text-white/65">
          {panelTrust.map((t, i) => {
            const Icon = t.icon;
            return (
              <span key={i} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-sky" />
                {t.text}
              </span>
            );
          })}
        </div>
      </aside>

      {/* ────────── FORM PANE ────────── */}
      <section className="flex flex-col gap-7 overflow-y-auto bg-white px-6 py-10 sm:px-16 sm:py-14">
        {topRight && (
          <div className="flex items-center justify-between text-[13px] font-medium text-mute">
            {topRight}
          </div>
        )}
        {children}
      </section>
    </div>
  );
}
