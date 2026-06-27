import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ENV } from "../config/env";
import { auth } from "../utils/auth";

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

export default function Login(): JSX.Element {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated()) {
      navigate("/dashboard", {
        replace: true,
      });

      return;
    }
  }, []);

  const handleCredentialLogin = async (response: GoogleCredentialResponse) => {
    if (!response.credential) return;

    setLoading(true);

    try {
      const googleUser = jwtDecode<GoogleUser>(response.credential);

      const res = await fetch(`${ENV.API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (!result.success) {
        throw new Error(result.message);
      }

      auth.save({
        isLogin: true,
        token: result.data.token,
        user: result.data.user,
      });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Google Sign In Failed");
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
        theme: "outline",
        size: "large",
        shape: "pill",
        width: 320,
      });
    }
  }, []);

return (
  <div className="relative min-h-screen overflow-hidden bg-slate-950">

    {/* Background */}

    <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-purple-600/20 blur-[140px]" />

    <div className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-pink-500/15 blur-[160px]" />

    <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6">

      <div className="grid w-full items-center gap-20 lg:grid-cols-2">

        {/* Left */}

        <div>

          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-purple-300 backdrop-blur">
            🚀 AI Powered Instagram Automation
          </div>

          <h1 className="mt-8 text-6xl font-black leading-tight text-white">

            Turn Instagram
            <br />

            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-300 bg-clip-text text-transparent">
              Comments Into Customers
            </span>

          </h1>

          <p className="mt-8 max-w-xl text-xl leading-9 text-slate-300">

            Automatically reply to comments,
            send personalized DMs,
            capture leads,
            and grow your business while you sleep.

          </p>

          <div className="mt-12 space-y-5">

            <div className="flex items-center gap-3 text-slate-200">

              <div className="h-2 w-2 rounded-full bg-green-400" />

              AI Generated Replies

            </div>

            <div className="flex items-center gap-3 text-slate-200">

              <div className="h-2 w-2 rounded-full bg-green-400" />

              Auto DM Every Customer

            </div>

            <div className="flex items-center gap-3 text-slate-200">

              <div className="h-2 w-2 rounded-full bg-green-400" />

              Keyword Based Automation

            </div>

            <div className="flex items-center gap-3 text-slate-200">

              <div className="h-2 w-2 rounded-full bg-green-400" />

              Analytics & Performance Tracking

            </div>

          </div>

        </div>

        {/* Right */}

        <div className="relative">

          <div className="rounded-3xl border border-white/10 bg-white/10 p-10 shadow-2xl backdrop-blur-xl">

            <div className="mb-8 text-center">

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-2xl font-bold text-white">

                IF

              </div>

              <h2 className="text-3xl font-bold text-white">

                Welcome to InstaFlow

              </h2>

              <p className="mt-3 text-slate-300">

                Continue with Google to manage your Instagram automations.

              </p>

            </div>

            <div className="flex justify-center">

              <div id="googleSignInDiv" />

            </div>

            {loading && (

              <div className="mt-8 flex justify-center">

                <div className="rounded-xl bg-purple-500/20 px-5 py-3 text-purple-200">

                  Signing you in...

                </div>

              </div>

            )}

            <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-slate-400">

              By continuing you agree to our

              <span className="mx-1 text-white">
                Terms
              </span>

              &

              <span className="ml-1 text-white">
                Privacy Policy
              </span>

            </div>

          </div>

          {/* Floating cards */}

          <div className="absolute -left-10 top-10 hidden rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur lg:block">

            <p className="text-xs text-slate-400">

              New Comment

            </p>

            <p className="mt-1 font-semibold text-white">

              "Price?"

            </p>

          </div>

          <div className="absolute -right-10 bottom-10 hidden rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur lg:block">

            <p className="text-xs text-slate-400">

              AI Action

            </p>

            <p className="mt-1 font-semibold text-green-300">

              DM Sent ✓

            </p>

          </div>

        </div>

      </div>

    </div>

  </div>
);
}
