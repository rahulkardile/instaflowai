import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Container from "./layout/Container";

export default function CTA() {
  return (
    <section className="py-24">
      <Container>
        <div
          className="relative overflow-hidden rounded-[28px] px-12 py-20 text-center"
          style={{ background: "#09090b" }}
        >
          {/* Subtle grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Glow */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "600px",
              height: "300px",
              background:
                "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-[40px] font-black leading-[1.08] tracking-[-0.03em] text-white">
              Start automating your Instagram today.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[16px] leading-[1.7] text-white/50">
              Join thousands of creators and businesses saving hours every week
              while growing their audience on autopilot.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/login"
                className="group flex items-center gap-2 rounded-[14px] px-6 py-3.5 text-[14px] font-semibold text-white no-underline transition-all hover:opacity-90 hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              >
                Get started free
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <a
                href="mailto:support@instaflow.ai"
                className="rounded-[14px] border border-white/10 px-6 py-3.5 text-[14px] font-semibold text-white/70 no-underline transition-all hover:bg-white/5 hover:text-white active:scale-[0.98]"
              >
                Talk to us
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}