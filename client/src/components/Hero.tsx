import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, Send, Zap, CheckCircle2 } from "lucide-react";
import { motion, type Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const, delay: i * 0.1 },
  }),
};


const stats = [
  { value: "v21.0", label: "Meta Graph API" },
  { value: "< 500ms", label: "Execution speed" },
  { value: "Real-time", label: "Webhook sync" },
];



const automationSteps = [
  {
    icon: MessageCircle,
    color: "#71717a",
    bg: "#f4f4f5",
    label: "New comment",
    text: '"How much does this cost?"',
    time: "now",
  },
  {
    icon: Zap,
    color: "#7c3aed",
    bg: "#f5f3ff",
    label: "AI triggered",
    text: "Keyword matched — sending reply + DM",
    time: "0.3s",
  },
  {
    icon: Send,
    color: "#16a34a",
    bg: "#f0fdf4",
    label: "Auto-reply sent",
    text: "Comment replied. DM delivered.",
    time: "0.8s",
  },
  {
    icon: CheckCircle2,
    color: "#7c3aed",
    bg: "#f5f3ff",
    label: "Lead captured",
    text: "@user123 is now in your pipeline",
    time: "1.0s",
  },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: "900px",
          height: "600px",
          background:
            "radial-gradient(ellipse at center top, rgba(124,58,237,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">

          {/* Left — copy */}
          <div>
            {/* Eyebrow */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white px-4 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              />
              <span className="text-[12px] font-medium text-[#71717a]">
                AI-powered Instagram automation
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="mt-6 text-[36px] font-black leading-[1.08] tracking-[-0.03em] text-[#111111] sm:text-[44px] md:text-[52px]"
            >
              Automate Instagram.
              <br />
              <span className="accent-text">Drive revenue.</span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="mt-6 max-w-[420px] text-[17px] leading-[1.7] text-[#71717a]"
            >
              Instantly reply to comments, send personalized DMs, and convert
              followers into customers — completely hands-free.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={3}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/login"
                className="group flex items-center gap-2 rounded-[14px] px-6 py-3.5 text-[14px] font-semibold text-white no-underline transition-all hover:shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              >
                Start for free
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 rounded-[14px] border border-black/[0.08] bg-white px-6 py-3.5 text-[14px] font-semibold text-[#111111] no-underline shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:bg-[#f4f4f5] active:scale-[0.98]"
              >
                See how it works
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={4}
              className="mt-10 flex flex-wrap items-center gap-6 md:mt-12 md:gap-8"
            >
              {stats.map((stat, i) => (
                <div key={stat.label}>
                  <p className="text-[20px] font-black tracking-tight text-[#111111]">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#71717a]">{stat.label}</p>
                  {i < stats.length - 1 && (
                    <span className="absolute hidden" />
                  )}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — animated preview */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
          >
            {/* Subtle glow behind card */}
            <div
              className="pointer-events-none absolute inset-0 -z-10 scale-110 rounded-[28px]"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)",
                filter: "blur(24px)",
              }}
            />

            {/* Preview card */}
            <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-[0_4px_32px_rgba(0,0,0,0.08)]">
              {/* Card header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-[#111111]">
                    Automation live
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#71717a]">
                    Processing in real-time
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.7)]" />
                  <span className="text-[11px] font-semibold text-green-700">
                    Active
                  </span>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {automationSteps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.6 + i * 0.15,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="flex items-start gap-3 rounded-[16px] border border-black/[0.04] p-3.5"
                      style={{ background: step.bg }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                        style={{ background: "rgba(255,255,255,0.9)" }}
                      >
                        <Icon size={15} style={{ color: step.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: step.color }}
                          >
                            {step.label}
                          </p>
                          <span className="shrink-0 text-[10px] text-[#a1a1aa]">
                            {step.time}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[13px] text-[#111111]">
                          {step.text}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Card footer */}
              <div className="mt-5 flex items-center justify-between rounded-[14px] bg-[#fafafb] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Zap size={13} className="text-[#7c3aed]" />
                  <span className="text-[12px] font-medium text-[#71717a]">
                    Powered by InstaFlow AI
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-[#7c3aed]">
                  0 errors
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}