import { motion } from "framer-motion";
import Container from "./layout/Container";

const steps = [
  {
    n: "01",
    title: "Sign in with Google",
    description:
      "Create your account in seconds using Google OAuth. No credit card required.",
  },
  {
    n: "02",
    title: "Connect Instagram",
    description:
      "Link your Instagram Business or Creator account. Secure, OAuth-based, revocable any time.",
  },
  {
    n: "03",
    title: "Create an automation",
    description:
      "Choose a reel, set keywords, write your reply and DM message. Done in under two minutes.",
  },
  {
    n: "04",
    title: "Watch it grow",
    description:
      "InstaFlow runs 24/7. Comments get replies, followers get DMs, you get customers.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32">
      <Container>

        {/* Section header */}
        <div className="mb-20 max-w-xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#7c3aed]">
            How it works
          </p>
          <h2 className="mt-3 text-[36px] font-black leading-[1.1] tracking-[-0.025em] text-[#111111]">
            Up and running
            <br />
            in minutes.
          </h2>
        </div>

        {/* Steps */}
        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connector line (desktop) */}
          <div
            className="pointer-events-none absolute top-7 left-8 right-8 hidden h-px lg:block"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)" }}
          />

          {steps.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.45,
                delay: i * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {/* Step number badge */}
              <div
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-[16px] border border-black/[0.06] bg-white text-[13px] font-black text-[#111111] shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
              >
                {step.n}
              </div>

              <h3 className="text-[15px] font-semibold text-[#111111]">
                {step.title}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.65] text-[#71717a]">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

      </Container>
    </section>
  );
}