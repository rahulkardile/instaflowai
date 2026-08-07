import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Container from "./layout/Container";

const faqs = [
  {
    q: "Do I need any coding knowledge?",
    a: "No. InstaFlow is designed for anyone — creators, marketers, and business owners. Everything works through a simple visual interface. No code, ever.",
  },
  {
    q: "Does it work with personal Instagram accounts?",
    a: "InstaFlow requires an Instagram Business or Creator account connected to a Facebook Page. Personal accounts don't have access to the Instagram API needed for automation.",
  },
  {
    q: "Is my Instagram account safe?",
    a: "Yes. We use official Instagram OAuth — we never ask for your password. You can revoke access at any time from your Instagram settings. All API calls follow Meta's platform policies.",
  },
  {
    q: "Can I automate only specific posts?",
    a: "Absolutely. You can set automations per reel or post and define keyword triggers so only the right comments activate the automation.",
  },
  {
    q: "How fast are the responses?",
    a: "Replies are triggered via Meta's real-time webhooks. In most cases, your automation will respond within a few seconds of a comment or DM being posted.",
  },
  {
    q: "What happens when App Review is approved?",
    a: "Your automations activate automatically. Once Meta approves your permissions, comment replies, DM sends, and webhook events all begin working with no changes needed on your end.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-32">
      <Container>
        <div className="grid gap-16 lg:grid-cols-[280px_1fr]">

          {/* Left — sticky header */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#7c3aed]">
              FAQ
            </p>
            <h2 className="mt-3 text-[32px] font-black leading-[1.1] tracking-[-0.025em] text-[#111111]">
              Common
              <br />
              questions.
            </h2>
            <p className="mt-4 text-[14px] leading-[1.65] text-[#71717a]">
              Can't find what you need? Email us at{" "}
              <a
                href="mailto:support@instaflow.ai"
                className="font-medium text-[#7c3aed] underline decoration-[#7c3aed]/30 underline-offset-2"
              >
                support@instaflow.ai
              </a>
            </p>
          </div>

          {/* Right — accordion */}
          <div className="divide-y divide-black/[0.05]">
            {faqs.map((faq, i) => (
              <div key={faq.q}>
                <button
                  id={`faq-${i}`}
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={open === i}
                >
                  <span className="text-[15px] font-semibold text-[#111111]">
                    {faq.q}
                  </span>
                  <span className="shrink-0 rounded-full border border-black/[0.08] p-1.5 text-[#71717a] transition-colors hover:bg-[#f4f4f5]">
                    {open === i ? <Minus size={14} /> : <Plus size={14} />}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 text-[14px] leading-[1.7] text-[#71717a]">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </div>
      </Container>
    </section>
  );
}
