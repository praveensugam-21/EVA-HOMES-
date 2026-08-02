import { useEffect, useRef, useState } from "react";
import { FaHome, FaEnvelope, FaLock, FaSpinner } from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleButtonRef = useRef(null);

  // If the Google redirect flow (see GoogleCallbackPage) sent us back here
  // after a failure, surface it instead of failing silently.
  useEffect(() => {
    if (searchParams.get("google_error")) {
      setError("Google sign-in failed. Please try again.");
    }
  }, [searchParams]);

  // Wait for the Google Identity Services script (loaded in index.html) to be
  // ready, then render its button into our div. Polls briefly since the
  // script tag is async and may not have executed yet on first render.
  //
  // ux_mode: "redirect" is deliberate — the default popup mode opens
  // accounts.google.com in a new window via window.open(), which browser
  // pop-up blockers and privacy extensions frequently block outright (seen
  // in production as "[GSI_LOGGER]: Failed to open popup window"). Redirect
  // mode is a full-page navigation instead, so there's no popup to block.
  // Google POSTs the result to login_uri (backend), which forwards here at
  // /auth/google/callback with a token in the URL fragment.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        setTimeout(tryInit, 100);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: "redirect",
        login_uri: `${BACKEND_URL}/api/auth/google/callback`,
      });

      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 336,
          text: "continue_with",
        });
      }
    };

    tryInit();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await login(formData.email, formData.password);
      navigate("/");
    } catch (err) {
      const message = getErrorMessage(err, "Login failed. Please check your credentials.");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <FaHome className="text-ink text-3xl" />
            <span className="text-2xl font-bold tracking-tight text-ink">
              EVA <span className="font-light text-muted">HOMES</span>
            </span>
          </Link>
          <p className="text-muted text-sm mt-2">Sign in to your real estate portal</p>
        </div>

        <div className="bg-white rounded-xl p-8 border-2 border-ink">
          <h2 className="text-xl font-bold text-ink mb-6">Welcome Back</h2>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-650 rounded-lg p-3.5 mb-5 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-ink-soft text-xs font-semibold mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-xs" />
                <input
                  type="email"
                  name="email"
                  id="login-email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@domain.com"
                  required
                  autoComplete="email"
                  className="w-full border border-line rounded-lg pl-9 pr-4 py-2.5 text-ink placeholder-faint text-sm focus:outline-none focus:border-ink transition bg-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-ink-soft text-xs font-semibold mb-1.5">
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-xs" />
                <input
                  type="password"
                  name="password"
                  id="login-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full border border-line rounded-lg pl-9 pr-4 py-2.5 text-ink placeholder-faint text-sm focus:outline-none focus:border-ink transition bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={isSubmitting}
              className="w-full bg-ink hover:bg-accent-hover disabled:bg-ink-soft disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin text-xs" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-surface flex-1" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">or</span>
                <div className="h-px bg-surface flex-1" />
              </div>
              <div ref={googleButtonRef} className="flex justify-center" />
            </>
          )}

          <p className="text-center text-muted mt-6 text-xs font-medium">
            Don't have an account?{" "}
            <Link to="/register" className="text-ink hover:underline">
              Create Account
            </Link>
          </p>


        </div>
      </div>
    </div>
  );
}
