import { Zap, Bot, Send, MessageCircleReply, BarChart3, Shield } from "lucide-react";
import { motion } from "framer-motion";
import Container from "./layout/Container";

const features = [
  {
    icon: Zap,
    title: "Instant replies",
    description:
      "Respond to comments within seconds of posting. Never miss an engagement opportunity while you're away.",
  },
  {
    icon: Bot,
    title: "AI-generated responses",
    description:
      "Smart replies that sound natural and on-brand. Configured once, refined continuously.",
  },
  {
    icon: Send,
    title: "Auto DM",
    description:
      "Send personalized direct messages to every commenter — automatically, at scale.",
  },
  {
    icon: MessageCircleReply,
    title: "Keyword triggers",
    description:
      "Define keywords that activate your automations. Precise control over every workflow.",
  },
  {
    icon: BarChart3,
    title: "Performance analytics",
    description:
      "Track comment replies, DM deliveries, and engagement in a unified activity log.",
  },
  {
    icon: Shield,
    title: "Secure by design",
    description:
      "OAuth-based authentication. Your credentials are never stored. Always protected.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-32">
      <Container>

        {/* Section header */}
        <div className="mb-16 max-w-xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#7c3aed]">
            Features
          </p>
          <h2 className="mt-3 text-[36px] font-black leading-[1.1] tracking-[-0.025em] text-[#111111]">
            Everything you need
            <br />
            to grow on Instagram.
          </h2>
          <p className="mt-4 text-[16px] leading-[1.7] text-[#71717a]">
            Built for creators and businesses who want to convert engagement
            into real customers — without the manual work.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.06,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="group rounded-[20px] border border-black/[0.06] bg-white p-7 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_24px_rgba(0,0,0,0.09)]"
              >
                {/* Icon */}
                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#fafafb] transition-colors group-hover:bg-violet-50">
                  <Icon
                    size={18}
                    className="text-[#71717a] transition-colors group-hover:text-[#7c3aed]"
                    strokeWidth={1.75}
                  />
                </div>

                {/* Text */}
                <h3 className="text-[15px] font-semibold text-[#111111]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.65] text-[#71717a]">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

      </Container>
    </section>
  );
}