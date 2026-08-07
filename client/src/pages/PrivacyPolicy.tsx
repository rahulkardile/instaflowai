import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Sun, Moon, Check, Mail, ExternalLink } from "lucide-react";
import { APP, ROUTES } from "../constants";
import { useTheme } from "../hooks/useTheme";

const sections = [
  {
    id: "overview",
    title: "1. Overview",
    content: `${APP.NAME} is an Instagram automation platform that helps businesses automatically reply to comments, send direct messages, and manage customer engagement on Instagram. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.\n\nBy using ${APP.NAME}, you agree to the practices described in this policy.`,
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    subsections: [
      {
        heading: "2.1 Account Information",
        text: `When you sign in with Google, we collect your name, email address, profile picture, and Google account ID to create and manage your ${APP.NAME} account.`,
      },
      {
        heading: "2.2 Instagram Account Data",
        text: `When you connect your Instagram Business account, we collect and store:\n• Your Instagram User ID and username\n• An access token (long-lived, up to 60 days) to act on your behalf\n• Your Instagram media (posts, reels) — ID, caption, thumbnail, permalink, like count, comment count\n• Comments on your media (commenter username, comment text, timestamp)\n• Direct Messages received on your account (sender ID, message text)`,
      },
      {
        heading: "2.3 Automation Configuration",
        text: `We store the automation rules you create, including: automation type (comment reply or DM), keywords, reply message templates, and the reels they apply to.`,
      },
      {
        heading: "2.4 Execution Logs",
        text: `We log every automated action taken (comment replies sent, DMs sent, incoming events received) including timestamps, status (success/failed), and any error messages. These logs are used to display your automation history and diagnose issues.`,
      },
      {
        heading: "2.5 Webhook Events",
        text: `Meta (Facebook) sends us real-time webhook notifications when someone comments on your post or sends you a DM. We process these events to trigger your configured automations and log them as described above.`,
      },
    ],
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information",
    items: [
      "To authenticate you and maintain your session",
      "To connect and communicate with Instagram's Graph API on your behalf",
      "To execute your configured automations (reply to comments, send DMs)",
      "To display your Instagram media, comment history, and DM logs in the dashboard",
      "To store and re-execute automation rules you have created",
      "To diagnose and fix errors in automation execution",
      "To improve the reliability and performance of our service",
    ],
  },
  {
    id: "meta-data",
    title: "4. Instagram / Meta Data Usage",
    content: `${APP.NAME} uses the Instagram Graph API and complies with Meta's Platform Terms. Specifically:\n\n• We access your Instagram data only with your explicit permission via OAuth.\n• We use the following Meta permissions: instagram_business_basic, instagram_business_manage_comments, and instagram_business_manage_messages.\n• We do not sell, rent, or share your Instagram data with any third parties.\n• We do not use your Instagram data for advertising, profiling, or any purpose outside of providing the ${APP.NAME} service to you.\n• Instagram access tokens are stored encrypted and are only used to make API calls on your behalf.\n• We do not store the content of your Instagram DMs beyond what is needed to display your conversation history and execute automations.`,
  },
  {
    id: "data-sharing",
    title: "5. Data Sharing",
    content: `We do not sell your personal data. We may share data in the following limited circumstances:\n\n• Service Providers: We use third-party infrastructure (e.g., MongoDB cloud, hosting providers) to operate our service. These providers are contractually bound to protect your data.\n• Legal Requirements: We may disclose data if required by law or to protect the rights and safety of ${APP.NAME} or its users.\n• Business Transfers: If ${APP.NAME} is acquired or merged, your data may be transferred as part of that transaction, subject to the same privacy commitments.`,
  },
  {
    id: "data-retention",
    title: "6. Data Retention",
    content: `• Account data is retained as long as your account is active.\n• Instagram access tokens are valid for up to 60 days and are refreshed when you reconnect your account.\n• Automation execution logs are retained for up to 12 months.\n• Webhook event logs are retained for 30 days.\n• You may request deletion of your data at any time by disconnecting your Instagram account from the dashboard or contacting us at ${APP.PRIVACY_EMAIL}.`,
  },
  {
    id: "security",
    title: "7. Security",
    content: `We implement industry-standard security measures including:\n• HTTPS encryption for all data in transit\n• Secure storage of access tokens\n• Authentication via JWT tokens with expiry\n• Restricted access to production databases\n\nNo system is 100% secure. If you believe your account has been compromised, contact us immediately at ${APP.PRIVACY_EMAIL}.`,
  },
  {
    id: "your-rights",
    title: "8. Your Rights",
    content: `You have the right to:\n• Access the personal data we hold about you\n• Correct inaccurate data\n• Request deletion of your data ("right to be forgotten")\n• Disconnect your Instagram account at any time from the dashboard\n• Withdraw consent for Instagram access (this will stop all automations)\n\nTo exercise any of these rights, contact us at ${APP.PRIVACY_EMAIL}.`,
  },
  {
    id: "cookies",
    title: "9. Cookies & Local Storage",
    content: `${APP.NAME} uses browser local storage to store your authentication token for session management. We do not use third-party tracking cookies or advertising pixels.`,
  },
  {
    id: "children",
    title: "10. Children's Privacy",
    content: `${APP.NAME} is not intended for use by anyone under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us and we will delete it.`,
  },
  {
    id: "changes",
    title: "11. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our website or sending an email. Your continued use of ${APP.NAME} after changes are posted constitutes your acceptance of the updated policy.`,
  },
  {
    id: "contact",
    title: "12. Contact Us",
    content: `If you have any questions about this Privacy Policy or how we handle your data, please contact us:\n\n${APP.COMPANY}\nEmail: ${APP.PRIVACY_EMAIL}\nWebsite: ${APP.WEBSITE}`,
  },
];

export default function PrivacyPolicy() {
  const { isDark, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen bg-[#fafafb] text-[#111111] transition-colors duration-300 dark:bg-[#09090b] dark:text-[#fafafa]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl transition-colors dark:border-white/[0.06] dark:bg-[#09090b]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to={ROUTES.HOME} className="flex items-center gap-2.5 no-underline">
            <img
              src="/instaFlow-icon.png"
              alt="InstaFlow Logo"
              className="h-8 w-8 rounded-[10px] object-cover"
            />

            <span className="text-[15px] font-semibold tracking-tight text-[#111111] dark:text-white">
              {APP.NAME}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-[#fafafb] text-[#71717a] transition hover:bg-[#f4f4f5] dark:border-white/[0.1] dark:bg-white/5 dark:text-[#a1a1aa] dark:hover:bg-white/10"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <Link
              to={ROUTES.HOME}
              className="flex items-center gap-1.5 rounded-[12px] border border-black/[0.08] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#111111] no-underline transition hover:bg-[#f4f4f5] dark:border-white/[0.1] dark:bg-white/5 dark:text-[#fafafa] dark:hover:bg-white/10"
            >
              <ArrowLeft size={13} />
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="border-b border-black/[0.06] bg-white py-16 transition-colors dark:border-white/[0.06] dark:bg-[#111114]">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1 text-[12px] font-medium text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300">
            <Shield size={13} />
            <span>Updated {APP.PRIVACY_LAST_UPDATED}</span>
          </div>

          <h1 className="mt-5 text-[40px] font-black leading-tight tracking-[-0.03em] text-[#111111] dark:text-white sm:text-[48px]">
            Privacy Policy
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#71717a] dark:text-[#a1a1aa]">
            We value your trust. This policy describes how {APP.NAME} collects, protects,
            and handles your data when using our Instagram automation services.
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="gap-12 lg:grid lg:grid-cols-[240px_1fr]">

          {/* Sticky Table of Contents Sidebar */}
          <aside className="mb-10 lg:mb-0">
            <div className="sticky top-24 rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-colors dark:border-white/[0.06] dark:bg-[#111114]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a1a1aa]">
                Sections
              </p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setActiveSection(s.id)}
                    className={`block truncate rounded-[10px] px-3 py-2 text-[13px] font-medium no-underline transition ${
                      activeSection === s.id
                        ? "bg-violet-50 text-[#7c3aed] dark:bg-violet-950/40 dark:text-violet-300"
                        : "text-[#71717a] hover:bg-[#fafafb] hover:text-[#111111] dark:text-[#a1a1aa] dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                  >
                    {s.title}
                  </a>
                ))}
              </nav>

              <div className="mt-6 border-t border-black/[0.05] pt-5 dark:border-white/[0.06]">
                <p className="text-[12px] font-semibold text-[#111111] dark:text-white">Have questions?</p>
                <p className="mt-1 text-[12px] text-[#71717a] dark:text-[#a1a1aa]">Contact our privacy team</p>
                <a
                  href={`mailto:${APP.PRIVACY_EMAIL}`}
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#7c3aed] no-underline hover:underline"
                >
                  <Mail size={12} />
                  {APP.PRIVACY_EMAIL}
                </a>
              </div>
            </div>
          </aside>

          {/* Main Document Content */}
          <main className="space-y-8">
            {/* Meta API Notice Banner */}
            <div className="rounded-[20px] border border-blue-200/70 bg-blue-50/60 p-6 transition-colors dark:border-blue-900/40 dark:bg-blue-950/30">
              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-blue-900 dark:text-blue-200">
                    Important Notice for Instagram Users
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-blue-800/80 dark:text-blue-300/80">
                    {APP.NAME} connects to Instagram via official Meta Graph API endpoints. We only access
                    data you explicitly authorize through Meta OAuth. You can revoke access at any time
                    via your Instagram settings or from your {APP.NAME} dashboard.
                  </p>
                </div>
              </div>
            </div>

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-[20px] border border-black/[0.06] bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-colors dark:border-white/[0.06] dark:bg-[#111114]"
              >
                <h2 className="mb-4 text-[20px] font-bold text-[#111111] dark:text-white">
                  {section.title}
                </h2>

                {"content" in section && section.content && (
                  <p className="whitespace-pre-line text-[14px] leading-[1.75] text-[#71717a] dark:text-[#a1a1aa]">
                    {section.content}
                  </p>
                )}

                {"items" in section && section.items && (
                  <ul className="space-y-2.5">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#71717a] dark:text-[#a1a1aa]">
                        <Check size={14} className="mt-1 shrink-0 text-[#7c3aed]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {"subsections" in section && section.subsections && (
                  <div className="space-y-5">
                    {section.subsections.map((sub, i) => (
                      <div key={i} className="rounded-[14px] border border-black/[0.04] bg-[#fafafb] p-4 dark:border-white/[0.04] dark:bg-white/[0.02]">
                        <h3 className="mb-1.5 text-[13px] font-semibold text-[#111111] dark:text-white">
                          {sub.heading}
                        </h3>
                        <p className="whitespace-pre-line text-[13px] leading-[1.65] text-[#71717a] dark:text-[#a1a1aa]">
                          {sub.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}

            {/* Footer CTA */}
            <div className="rounded-[24px] border border-black/[0.06] bg-white p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors dark:border-white/[0.06] dark:bg-[#111114]">
              <h3 className="text-[18px] font-bold text-[#111111] dark:text-white">
                Questions about your data?
              </h3>
              <p className="mt-2 text-[14px] text-[#71717a] dark:text-[#a1a1aa]">
                We respond to all privacy requests within 48 hours.
              </p>
              <a
                href={`mailto:${APP.PRIVACY_EMAIL}`}
                className="mt-5 inline-flex items-center gap-2 rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white no-underline transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              >
                <Mail size={15} />
                Contact Privacy Team
              </a>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] bg-white py-8 text-center text-[13px] text-[#71717a] transition-colors dark:border-white/[0.06] dark:bg-[#09090b] dark:text-[#a1a1aa]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p>© {APP.YEAR} {APP.COMPANY}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to={ROUTES.HOME} className="text-[#71717a] no-underline hover:text-[#111111] dark:text-[#a1a1aa] dark:hover:text-white">
              Home
            </Link>
            <a href={`mailto:${APP.EMAIL}`} className="text-[#71717a] no-underline hover:text-[#111111] dark:text-[#a1a1aa] dark:hover:text-white">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
