import { Link } from "react-router-dom";
import Container from "./Container";


const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "FAQ", href: "#faq" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy-policy", internal: true },
    { label: "Terms of Service", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.06] bg-white">
      <Container>
        <div className="py-16">
          <div className="flex flex-col gap-12 md:flex-row md:gap-24">

            {/* Brand */}
            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] text-xs font-black text-white"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
                >
                  IF
                </div>
                <span className="text-[15px] font-semibold tracking-tight text-[#111111]">
                  InstaFlow
                </span>
              </div>
              <p className="mt-4 max-w-[240px] text-[13px] leading-[1.7] text-[#71717a]">
                AI-powered Instagram automation for creators and businesses who
                want to grow without the manual work.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-16">
              {Object.entries(links).map(([group, items]) => (
                <div key={group}>
                  <p className="mb-4 text-[12px] font-semibold text-[#111111]">
                    {group}
                  </p>
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li key={item.label}>
                        {"internal" in item && item.internal ? (
                          <Link
                            to={item.href}
                            className="text-[13px] text-[#71717a] no-underline transition-colors hover:text-[#111111]"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <a
                            href={item.href}
                            className="text-[13px] text-[#71717a] no-underline transition-colors hover:text-[#111111]"
                          >
                            {item.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

          </div>
        </div>

        <div className="border-t border-black/[0.05] py-6 text-[12px] text-[#71717a]">
          © {new Date().getFullYear()} InstaFlow Pvt Limited. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}