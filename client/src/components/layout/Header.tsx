import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../utils/auth";
import api from "../../utils/api";
import { Loader2, Camera } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [connectingIG, setConnectingIG] = useState(false);

  const session = auth.get();
  const user = session?.user;
  const authenticated = auth.isAuthenticated();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  const handleConnectInstagram = async () => {
    setConnectingIG(true);
    try {
      const { data } = await api.get("/instagram/auth");
      window.location.href = data.data.url;
    } catch {
      setConnectingIG(false);
    }
  };

  const isLanding =
    location.pathname === "/" || location.pathname === "/about";

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
      <header
        className={`w-full max-w-6xl transition-all duration-300 ${
          scrolled
            ? "rounded-2xl bg-white/95 shadow-[0_2px_20px_rgba(0,0,0,0.08)] backdrop-blur-xl"
            : "rounded-2xl bg-white/80 shadow-[0_1px_8px_rgba(0,0,0,0.05)] backdrop-blur-md"
        } border border-black/[0.06]`}
      >
        <div className="flex h-14 items-center justify-between px-5">

          {/* Logo */}
          <Link
            to={authenticated ? "/dashboard" : "/"}
            className="flex items-center gap-2.5 no-underline"
          >
            <img
              src="/instaFlow-icon.png"
              alt="InstaFlow Logo"
              className="h-8 w-8 rounded-[10px] object-cover"
            />

            <span className="text-[15px] font-semibold tracking-tight text-[#111111]">
              InstaFlow
            </span>
          </Link>

          {/* Nav — landing only, unauthenticated */}
          {!authenticated && isLanding && (
            <nav className="hidden items-center gap-1 md:flex">
              {[
                { href: "#features", label: "Features" },
                { href: "#how-it-works", label: "How it works" },
                { href: "#faq", label: "FAQ" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#71717a] transition-colors hover:bg-black/[0.04] hover:text-[#111111] no-underline"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {!authenticated ? (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#71717a] transition-colors hover:bg-black/[0.04] hover:text-[#111111] no-underline sm:block"
                >
                  Sign in
                </Link>
                <Link
                  to="/login"
                  className="rounded-[14px] px-4 py-2 text-[13px] font-semibold text-white no-underline transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
                >
                  Get started
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className={`rounded-[10px] px-3 py-2 text-[13px] font-medium no-underline transition-colors ${
                    location.pathname === "/dashboard"
                      ? "bg-violet-50 text-violet-700"
                      : "text-[#71717a] hover:bg-black/[0.04] hover:text-[#111111]"
                  }`}
                >
                  Dashboard
                </Link>

                {!user?.instagramConnected && (
                  <button
                    onClick={handleConnectInstagram}
                    disabled={connectingIG}
                    className="flex items-center gap-1.5 rounded-[14px] px-3.5 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
                  >
                    {connectingIG ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                    {connectingIG ? "Connecting…" : "Connect IG"}
                  </button>
                )}

                <button
                  onClick={logout}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition hover:ring-violet-200"
                  aria-label="Profile menu"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-violet-100 text-xs font-bold text-violet-700">
                      {user?.name?.[0]}
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>
      </header>
    </div>
  );
}