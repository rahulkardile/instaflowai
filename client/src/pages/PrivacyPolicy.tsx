import { Link } from "react-router-dom";

const LAST_UPDATED = "August 7, 2026";
const COMPANY = "InstaFlow Pvt Limited";
const APP_NAME = "InstaFlow";
const CONTACT_EMAIL = "privacy@instaflow.ai";
const WEBSITE = "https://instaflow.ai";

const sections = [
  {
    id: "overview",
    title: "1. Overview",
    content: `${APP_NAME} is an Instagram automation platform that helps businesses automatically reply to comments, send direct messages, and manage customer engagement on Instagram. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.\n\nBy using ${APP_NAME}, you agree to the practices described in this policy.`,
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    subsections: [
      {
        heading: "2.1 Account Information",
        text: `When you sign in with Google, we collect your name, email address, profile picture, and Google account ID to create and manage your ${APP_NAME} account.`,
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
    content: `${APP_NAME} uses the Instagram Graph API and complies with Meta's Platform Terms. Specifically:\n\n• We access your Instagram data only with your explicit permission via OAuth.\n• We use the following Meta permissions: instagram_business_basic, instagram_business_manage_comments, and instagram_business_manage_messages.\n• We do not sell, rent, or share your Instagram data with any third parties.\n• We do not use your Instagram data for advertising, profiling, or any purpose outside of providing the ${APP_NAME} service to you.\n• Instagram access tokens are stored encrypted and are only used to make API calls on your behalf.\n• We do not store the content of your Instagram DMs beyond what is needed to display your conversation history and execute automations.`,
  },
  {
    id: "data-sharing",
    title: "5. Data Sharing",
    content: `We do not sell your personal data. We may share data in the following limited circumstances:\n\n• Service Providers: We use third-party infrastructure (e.g., MongoDB cloud, hosting providers) to operate our service. These providers are contractually bound to protect your data.\n• Legal Requirements: We may disclose data if required by law or to protect the rights and safety of ${APP_NAME} or its users.\n• Business Transfers: If ${APP_NAME} is acquired or merged, your data may be transferred as part of that transaction, subject to the same privacy commitments.`,
  },
  {
    id: "data-retention",
    title: "6. Data Retention",
    content: `• Account data is retained as long as your account is active.\n• Instagram access tokens are valid for up to 60 days and are refreshed when you reconnect your account.\n• Automation execution logs are retained for up to 12 months.\n• Webhook event logs are retained for 30 days.\n• You may request deletion of your data at any time by disconnecting your Instagram account from the dashboard or contacting us at ${CONTACT_EMAIL}.`,
  },
  {
    id: "security",
    title: "7. Security",
    content: `We implement industry-standard security measures including:\n• HTTPS encryption for all data in transit\n• Secure storage of access tokens\n• Authentication via JWT tokens with expiry\n• Restricted access to production databases\n\nNo system is 100% secure. If you believe your account has been compromised, contact us immediately at ${CONTACT_EMAIL}.`,
  },
  {
    id: "your-rights",
    title: "8. Your Rights",
    content: `You have the right to:\n• Access the personal data we hold about you\n• Correct inaccurate data\n• Request deletion of your data ("right to be forgotten")\n• Disconnect your Instagram account at any time from the dashboard\n• Withdraw consent for Instagram access (this will stop all automations)\n\nTo exercise any of these rights, contact us at ${CONTACT_EMAIL}.`,
  },
  {
    id: "cookies",
    title: "9. Cookies & Local Storage",
    content: `${APP_NAME} uses browser local storage to store your authentication token for session management. We do not use third-party tracking cookies or advertising pixels.`,
  },
  {
    id: "children",
    title: "10. Children's Privacy",
    content: `${APP_NAME} is not intended for use by anyone under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us and we will delete it.`,
  },
  {
    id: "changes",
    title: "11. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our website or sending an email. Your continued use of ${APP_NAME} after changes are posted constitutes your acceptance of the updated policy.`,
  },
  {
    id: "contact",
    title: "12. Contact Us",
    content: `If you have any questions about this Privacy Policy or how we handle your data, please contact us:\n\n${COMPANY}\nEmail: ${CONTACT_EMAIL}\nWebsite: ${WEBSITE}`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-20 h-[500px] w-[500px] rounded-full bg-purple-700/20 blur-[140px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-pink-600/15 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      {/* Nav bar */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            style={{ textDecoration: "none", color: "white" }}
            className="flex items-center gap-3 text-xl font-black"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-sm font-bold text-white shadow-lg">
              IF
            </div>
            InstaFlow
          </Link>
          <Link
            to="/"
            style={{ textDecoration: "none" }}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm text-slate-300 transition-all hover:border-purple-500/50 hover:bg-white/10 hover:text-white"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 border-b border-white/10 py-16 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
            <span>🔒</span>
            <span>Last Updated: {LAST_UPDATED}</span>
          </div>
          <h1 className="mt-4 text-5xl font-black leading-tight text-white">
            Privacy{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-300 bg-clip-text text-transparent">
              Policy
            </span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            We take your privacy seriously. This policy explains exactly what data we collect,
            how we use it, and the rights you have over your information.
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div className="gap-12 lg:grid lg:grid-cols-[280px_1fr]">

          {/* Sticky TOC sidebar */}
          <aside className="mb-12 lg:mb-0">
            <div className="sticky top-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-purple-400">
                Table of Contents
              </h2>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    style={{ textDecoration: "none" }}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-400 transition-all hover:bg-white/8 hover:text-white"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>

              {/* Quick contact */}
              <div className="mt-8 rounded-xl border border-purple-500/25 bg-purple-500/10 p-4">
                <p className="text-xs font-semibold text-purple-300">Questions?</p>
                <p className="mt-1 text-xs text-slate-400">Contact our privacy team</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-2 block text-xs font-medium text-purple-300 hover:text-purple-200"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="space-y-8">
            {/* Instagram notice */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/8 p-6">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 text-2xl">!</span>
                <div>
                  <p className="font-semibold text-blue-200">Important notice for Instagram users</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {APP_NAME} connects to Instagram via the official Meta Graph API. We only access
                    data you explicitly authorize through Instagram's OAuth flow. You can revoke
                    access at any time from your Instagram settings or the {APP_NAME} dashboard.
                  </p>
                </div>
              </div>
            </div>

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-8 rounded-2xl border border-white/8 bg-white/4 p-8 backdrop-blur-sm transition-all hover:border-white/15"
              >
                <h2 className="mb-5 text-xl font-bold text-white">{section.title}</h2>

                {"content" in section && section.content && (
                  <p className="whitespace-pre-line text-sm leading-8 text-slate-300">
                    {section.content}
                  </p>
                )}

                {"items" in section && section.items && (
                  <ul className="space-y-3">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                          style={{ minWidth: "8px" }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {"subsections" in section && section.subsections && (
                  <div className="space-y-6">
                    {section.subsections.map((sub, i) => (
                      <div key={i}>
                        <h3 className="mb-2 text-sm font-semibold text-purple-300">
                          {sub.heading}
                        </h3>
                        <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
                          {sub.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}

            {/* Contact CTA */}
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-900/40 to-pink-900/30 p-8 text-center">
              <h3 className="text-lg font-bold text-white">Have questions about your data?</h3>
              <p className="mt-2 text-sm text-slate-400">
                We're committed to transparency. Reach out and we'll respond within 48 hours.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ textDecoration: "none" }}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90"
              >
                ✉️ Contact Privacy Team
              </a>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-sm text-slate-500">
        <p>© 2026 {COMPANY}. All rights reserved.</p>
        <div className="mt-3 flex items-center justify-center gap-6">
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }} className="hover:text-white transition-colors">
            Home
          </Link>
          <span className="text-slate-700">|</span>
          <Link to="/privacy-policy" style={{ textDecoration: "none" }} className="text-purple-400 hover:text-purple-300 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
