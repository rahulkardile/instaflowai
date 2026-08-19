import { useEffect, useState, type JSX } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useForm } from "react-hook-form";
import { ENV } from "../config/env";
import { auth } from "../utils/auth";
import {
  ArrowLeft,
  Zap,
  MessageCircle,
  Send,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ─────────────────────────────────────────────────────────────── */

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

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const leftFeatures = [
  { icon: Zap, text: "Instant comment replies" },
  { icon: MessageCircle, text: "Keyword-triggered automations" },
  { icon: Send, text: "Personalized DM campaigns" },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function InputField({
  id,
  label,
  type,
  placeholder,
  error,
  icon: Icon,
  showToggle,
  onToggle,
  registration,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  error?: string;
  icon: React.ElementType;
  showToggle?: boolean;
  onToggle?: () => void;
  registration: object;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-[#374151] dark:text-[#d1d5db]">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
          <Icon size={15} />
        </div>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete={id}
          {...registration}
          className={`w-full rounded-[12px] border bg-white py-2.5 pl-10 pr-10 text-[14px] text-[#111111] placeholder:text-[#9ca3af] outline-none transition-all dark:bg-[#18181b] dark:text-white dark:placeholder:text-[#71717a] ${
            error
              ? "border-red-400 ring-2 ring-red-100 dark:ring-red-900/30"
              : "border-black/[0.12] focus:border-[#7c3aed] focus:ring-2 focus:ring-violet-100 dark:border-white/[0.12] dark:focus:border-violet-500 dark:focus:ring-violet-900/30"
          }`}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] transition hover:text-[#6b7280]"
            tabIndex={-1}
          >
            {type === "password" ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-[12px] text-red-600 dark:text-red-400">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function Login(): JSX.Element {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* ── Login form ── */
  const loginForm = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
  });

  /* ── Register form ── */
  const registerForm = useForm<RegisterForm>({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  /* ── Redirect if already logged in ── */
  useEffect(() => {
    if (auth.isAuthenticated()) navigate("/dashboard", { replace: true });
  }, []);

  /* ── Google credential handler ── */
  const handleCredentialLogin = async (response: GoogleCredentialResponse) => {
    if (!response.credential) return;
    setServerError("");
    setGoogleLoading(true);
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
      setServerError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ── Init Google button ── */
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
  }, [activeTab]);

  /* ── Email/Password Sign In ── */
  const onSignIn = loginForm.handleSubmit(async (values) => {
    setServerError("");
    try {
      const res = await fetch(`${ENV.API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      auth.save({ isLogin: true, token: result.data.token, user: result.data.user });
      navigate("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Sign in failed.");
    }
  });

  /* ── Email/Password Register ── */
  const onRegister = registerForm.handleSubmit(async (values) => {
    setServerError("");
    if (values.password !== values.confirmPassword) {
      registerForm.setError("confirmPassword", { message: "Passwords do not match" });
      return;
    }
    try {
      const res = await fetch(`${ENV.API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "local",
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      auth.save({ isLogin: true, token: result.data.token, user: result.data.user });
      navigate("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed.");
    }
  });

  const clearError = () => setServerError("");

  return (
    <div className="flex min-h-screen bg-[#fafafb] dark:bg-[#09090b]">

      {/* ── Left panel — brand (large screen only) ── */}
      <div className="hidden flex-col justify-between bg-[#09090b] p-12 lg:flex lg:w-[480px]">
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

        <p className="text-[12px] text-white/30">
          © {new Date().getFullYear()} InstaFlow Pvt Limited
        </p>
      </div>

      {/* ── Right panel — auth forms ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8">

        {/* Back link (mobile) */}
        <div className="mb-10 w-full max-w-sm lg:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#71717a] no-underline transition-colors hover:text-[#111111] dark:text-[#a1a1aa] dark:hover:text-white"
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
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img
              src="/instaFlow-icon.png"
              alt="InstaFlow Logo"
              className="h-9 w-9 rounded-[11px] object-cover"
            />
            <span className="text-[15px] font-semibold text-[#111111] dark:text-white">InstaFlow</span>
          </div>

          {/* ── Tab switcher ── */}
          <div className="mb-8 flex rounded-[14px] border border-black/[0.08] bg-[#f4f4f5] p-1 dark:border-white/[0.08] dark:bg-white/[0.06]">
            {(["signin", "register"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  clearError();
                  loginForm.clearErrors();
                  registerForm.clearErrors();
                }}
                className={`flex-1 rounded-[10px] py-2 text-[13px] font-semibold transition-all duration-150 ${
                  activeTab === tab
                    ? "bg-white text-[#111111] shadow-[0_1px_4px_rgba(0,0,0,0.10)] dark:bg-[#18181b] dark:text-white"
                    : "text-[#71717a] hover:text-[#111111] dark:text-[#71717a] dark:hover:text-white"
                }`}
              >
                {tab === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "signin" ? (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-[26px] font-black tracking-[-0.025em] text-[#111111] dark:text-white">
                  Welcome back
                </h1>
                <p className="mt-1.5 text-[14px] text-[#71717a] dark:text-[#a1a1aa]">
                  Sign in to manage your Instagram automations.
                </p>

                {/* Google sign-in */}
                <div className="mt-6">
                  <div id="googleSignInDiv" className="flex justify-start" />
                </div>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.08]" />
                  <span className="text-[12px] text-[#a1a1aa]">or continue with email</span>
                  <div className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.08]" />
                </div>

                {/* Email/Password form */}
                <form onSubmit={onSignIn} className="space-y-4" noValidate>
                  <InputField
                    id="login-email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    icon={Mail}
                    error={loginForm.formState.errors.email?.message}
                    registration={loginForm.register("email", {
                      required: "Email is required",
                      pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
                    })}
                  />
                  <InputField
                    id="login-password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    icon={Lock}
                    showToggle
                    onToggle={() => setShowPassword((p) => !p)}
                    error={loginForm.formState.errors.password?.message}
                    registration={loginForm.register("password", {
                      required: "Password is required",
                    })}
                  />

                  {serverError && (
                    <div className="flex items-center gap-2 rounded-[12px] border border-red-200/60 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                      <AlertCircle size={14} className="shrink-0" />
                      {serverError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginForm.formState.isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#111111] py-3 text-[14px] font-semibold text-white transition hover:bg-black disabled:opacity-60"
                  >
                    {loginForm.formState.isSubmitting && (
                      <Loader2 size={15} className="animate-spin" />
                    )}
                    Sign In
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-[26px] font-black tracking-[-0.025em] text-[#111111] dark:text-white">
                  Create account
                </h1>
                <p className="mt-1.5 text-[14px] text-[#71717a] dark:text-[#a1a1aa]">
                  Get started with InstaFlow for free.
                </p>

                {/* Google sign-in */}
                <div className="mt-6">
                  <div id="googleSignInDiv" className="flex justify-start" />
                </div>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.08]" />
                  <span className="text-[12px] text-[#a1a1aa]">or register with email</span>
                  <div className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.08]" />
                </div>

                {/* Register form */}
                <form onSubmit={onRegister} className="space-y-4" noValidate>
                  <InputField
                    id="register-name"
                    label="Full name"
                    type="text"
                    placeholder="Jane Doe"
                    icon={User}
                    error={registerForm.formState.errors.name?.message}
                    registration={registerForm.register("name", {
                      required: "Name is required",
                      minLength: { value: 2, message: "Name must be at least 2 characters" },
                    })}
                  />
                  <InputField
                    id="register-email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    icon={Mail}
                    error={registerForm.formState.errors.email?.message}
                    registration={registerForm.register("email", {
                      required: "Email is required",
                      pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
                    })}
                  />
                  <InputField
                    id="register-password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    icon={Lock}
                    showToggle
                    onToggle={() => setShowPassword((p) => !p)}
                    error={registerForm.formState.errors.password?.message}
                    registration={registerForm.register("password", {
                      required: "Password is required",
                      minLength: { value: 8, message: "At least 8 characters" },
                      pattern: {
                        value: /(?=.*[A-Z])(?=.*[0-9])/,
                        message: "Must include an uppercase letter and a number",
                      },
                    })}
                  />
                  <InputField
                    id="register-confirm-password"
                    label="Confirm password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    icon={Lock}
                    showToggle
                    onToggle={() => setShowConfirmPassword((p) => !p)}
                    error={registerForm.formState.errors.confirmPassword?.message}
                    registration={registerForm.register("confirmPassword", {
                      required: "Please confirm your password",
                    })}
                  />

                  {serverError && (
                    <div className="flex items-center gap-2 rounded-[12px] border border-red-200/60 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                      <AlertCircle size={14} className="shrink-0" />
                      {serverError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={registerForm.formState.isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#7c3aed] py-3 text-[14px] font-semibold text-white transition hover:bg-[#6d28d9] disabled:opacity-60"
                  >
                    {registerForm.formState.isSubmitting && (
                      <Loader2 size={15} className="animate-spin" />
                    )}
                    Create Account
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {googleLoading && (
            <div className="mt-5 flex items-center gap-2 rounded-[14px] border border-black/[0.06] bg-white px-4 py-3 text-[13px] text-[#71717a] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <Loader2 size={14} className="animate-spin text-[#7c3aed]" />
              Signing you in…
            </div>
          )}

          {/* Legal */}
          <p className="mt-7 text-[12px] leading-[1.6] text-[#a1a1aa]">
            By continuing, you agree to our{" "}
            <a href="#" className="underline decoration-[#a1a1aa]/50 underline-offset-2 hover:text-[#71717a]">
              Terms of Service
            </a>{" "}
            and{" "}
            <Link
              to="/privacy-policy"
              className="hover:text-[#71717a]"
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
