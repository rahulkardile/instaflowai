import { useEffect, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ENV } from "../config/env";

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

declare global {
  interface Window {
    google: typeof google;
  }
}

export default function Login(): JSX.Element {
  const navigate = useNavigate();

  const handleCredentialLogin = async (
    response: GoogleCredentialResponse
  ): Promise<void> => {
    if (!response.credential) return;

    try {
      const googleUser = jwtDecode<GoogleUser>(response.credential);
      console.log({googleUser});
      
      const res = await fetch(
        `${ENV.API_URL}/auth/register`,
        {
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
        }
      );

      const result = await res.json();

      if (!result.success) {
        alert(result.message);
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          isLogin: true,
          token: result.data.token,
          user: result.data.user,
        })
      );

      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Google Sign-In failed");
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-slate-900">
          Welcome Back
        </h1>

        <p className="mb-8 text-center text-slate-500">
          Sign in to continue
        </p>

        <div className="flex justify-center">
          <div id="googleSignInDiv" />
        </div>
      </div>
    </div>
  );
}