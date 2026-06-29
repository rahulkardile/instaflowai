import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "./Container";
import { auth } from "../../utils/auth";
import api from "../../utils/api";
import { LogOut, LayoutDashboard, Loader2, Camera, Film } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [connectingIG, setConnectingIG] = useState(false);

  const session = auth.get();
  const user = session?.user;

  const authenticated = auth.isAuthenticated();

  const logout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  const handleConnectInstagram = async () => {
    setConnectingIG(true);
    try {
      const { data } = await api.get("/instagram/auth");
      window.location.href = data.data.url;
    } catch (err) {
      console.error("Failed to start Instagram auth:", err);
      setConnectingIG(false);
    }
  };

  const isLanding =
    location.pathname === "/" ||
    location.pathname === "/about";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <Container>
        <div className="flex h-18 items-center justify-between">

          {/* Logo */}

          <Link to={authenticated ? "/dashboard" : "/"} className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-lg font-bold text-white shadow-lg">
              IF
            </div>

            <div>

              <p className="text-lg font-bold text-slate-900">
                InstaFlow
              </p>

              <p className="text-xs text-slate-500">
                Instagram Automation
              </p>

            </div>

          </Link>

          {/* Navigation */}

          {!authenticated && isLanding && (
            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">

              <a href="#features" className="hover:text-purple-600">
                Features
              </a>

              <a href="#pricing" className="hover:text-purple-600">
                Pricing
              </a>

              <Link
                to="/about"
                className="hover:text-purple-600"
              >
                About
              </Link>

              <a href="#faq" className="hover:text-purple-600">
                FAQ
              </a>

            </nav>
          )}

          {/* Right Side */}

          {!authenticated ? (
            <div className="flex items-center gap-3">

              <Link
                to="/login"
                className="rounded-xl px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Login
              </Link>

              <Link
                to="/login"
                className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 font-semibold text-white shadow-lg transition hover:scale-105"
              >
                Start Free
              </Link>

            </div>
          ) : (
            <div className="flex items-center gap-4">

              <Link
                to="/dashboard"
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-slate-700 transition hover:bg-slate-100 ${
                  location.pathname === "/dashboard" ? "bg-purple-50 text-purple-700 font-semibold" : ""
                }`}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>

              <Link
                to="/reels"
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-slate-700 transition hover:bg-slate-100 ${
                  location.pathname === "/reels" ? "bg-purple-50 text-purple-700 font-semibold" : ""
                }`}
              >
                <Film size={18} />
                Reels
              </Link>

              {!user?.instagramConnected && (
                <button
                  onClick={handleConnectInstagram}
                  disabled={connectingIG}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 font-semibold text-white shadow-lg transition hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
                >
                  {connectingIG ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Camera size={18} />
                  )}
                  {connectingIG ? "Connecting…" : "Connect Instagram"}
                </button>
              )}

              <div className="flex items-center gap-3 rounded-2xl border bg-white px-3 py-2 shadow-sm">

                <img
                  src={user?.avatar}
                  alt={user?.name}
                  className="h-10 w-10 rounded-full border object-cover"
                />

                <div className="hidden text-left lg:block">

                  <p className="font-semibold text-slate-900">
                    {user?.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {user?.email}
                  </p>

                </div>

              </div>

              <button
                onClick={logout}
                className="rounded-xl p-3 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={20} />
              </button>

            </div>
          )}

        </div>
      </Container>
    </header>
  );
}