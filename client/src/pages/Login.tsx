import { useEffect, useState, type JSX } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ENV } from "../config/env";
import { auth } from "../utils/auth";
import { ArrowLeft, Zap, MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  email_verified?: boolean;
}

const leftFeatures = [
  { icon: Zap, text: "Instant comment replies" },
  { icon: MessageCircle, text: "Keyword-triggered automations" },
  { icon: Send, text: "Personalized DM campaigns" },
];

export default function Login(): JSX.Element {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, []);

  const handleCredentialLogin = async (response: GoogleCredentialResponse) => {
    if (!response.credential) return;
    setLoading(true);
    try {
      const googleUser = jwtDecode<GoogleUser>(response.credential);
      const res = await fetch(`${ENV.API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          providerId: googleUser.sub,
          name: googleUser.name,
          email: googleUser.email,
          avatar: googleUser.picture,
          givenName: googleUser.given_name,
          familyName: googleUser.family_name,
          locale: googleUser.locale,
          emailVerified: googleUser.email_verified,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      auth.save({ isLogin: true, token: result.data.token, user: result.data.user });
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: ENV.GOOGLE_CLIENT_ID,
      callback: handleCredentialLogin,
    });
    const buttonDiv = document.getElementById("googleSignInDiv");
    if (buttonDiv) {
      window.google.accounts.id.renderButton(buttonDiv, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        width: 320,
        text: "continue_with",
      });
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-[#fafafb]">

      {/* Left panel — brand */}
      <div className="hidden flex-col justify-between bg-[#09090b] p-12 lg:flex lg:w-[480px]">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2.5">
            <img
              src="/instaFlow-icon.png"
              alt="InstaFlow Logo"
              className="h-9 w-9 rounded-[11px] object-cover"
            />

            <span className="text-[15px] font-semibold text-white">InstaFlow</span>
          </div>
        </div>

        {/* Middle — headline + features */}
        <div>
          <h2 className="text-[36px] font-black leading-[1.1] tracking-[-0.03em] text-white">
            Your Instagram,
            <br />
            on autopilot.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-white/50">
            Automate comment replies and DMs while you focus on creating.
          </p>
          <ul className="mt-8 space-y-3">
            {leftFeatures.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/8">
                  <Icon size={13} className="text-white/70" />
                </div>
                <span className="text-[13px] text-white/70">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — legal */}
        <p className="text-[12px] text-white/30">
          © {new Date().getFullYear()} InstaFlow Pvt Limited
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">

        {/* Back link (mobile) */}
        <div className="mb-12 w-full max-w-sm lg:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#71717a] no-underline transition-colors hover:text-[#111111]"
          >
            <ArrowLeft size={13} />
            Back to home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm"
        >
          {/* Logo (desktop hidden — it's on left panel) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img
              src="/instaFlow-icon.png"
              alt="InstaFlow Logo"
              className="h-9 w-9 rounded-[11px] object-cover"
            />

            <span className="text-[15px] font-semibold text-[#111111]">InstaFlow</span>
          </div>

          <h1 className="text-[28px] font-black tracking-[-0.025em] text-[#111111]">
            Welcome back
          </h1>
          <p className="mt-2 text-[14px] text-[#71717a]">
            Sign in to manage your Instagram automations.
          </p>

          {/* Google sign-in button */}
          <div className="mt-8">
            <div id="googleSignInDiv" className="flex justify-start" />
          </div>

          {loading && (
            <div className="mt-6 flex items-center gap-2 rounded-[14px] border border-black/[0.06] bg-white px-4 py-3 text-[13px] text-[#71717a] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#7c3aed]/20 border-t-[#7c3aed]" />
              Signing you in…
            </div>
          )}

          {/* Legal */}
          <p className="mt-8 text-[12px] leading-[1.6] text-[#a1a1aa]">
            By continuing, you agree to our{" "}
            <a href="#" className="underline decoration-[#a1a1aa]/50 underline-offset-2 hover:text-[#71717a]">
              Terms of Service
            </a>{" "}
            and{" "}
            <Link
              to="/privacy-policy"
              className="underline decoration-[#a1a1aa]/50 underline-offset-2 no-underline hover:text-[#71717a]"
              style={{ textDecoration: "underline" }}
            >
              Privacy Policy
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}
