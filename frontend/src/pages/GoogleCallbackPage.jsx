import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

// Landing point for Google's redirect sign-in flow (see LoginPage/RegisterPage
// and backend routers/auth.py:google_login_redirect). The backend already
// verified the Google ID token and issued our own JWT, passed here in the
// URL fragment (#token=...) rather than a query string so it's never sent
// to a server or written to any access log.
export default function GoogleCallbackPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const token = hashParams.get("token");

    // Clear the fragment immediately so the token doesn't linger in the
    // address bar or browser history any longer than necessary.
    window.history.replaceState(null, "", window.location.pathname);

    if (!token) {
      navigate("/login?google_error=1", { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => navigate("/", { replace: true }))
      .catch(() => {
        setError("Google sign-in failed. Please try again.");
        setTimeout(() => navigate("/login?google_error=1", { replace: true }), 1500);
      });
  }, [loginWithToken, navigate]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3 p-6">
      <FaSpinner className="animate-spin text-ink text-2xl" />
      <p className="text-muted text-sm">{error || "Finishing sign-in..."}</p>
    </div>
  );
}
