import { useEffect, useRef, useState } from "react";
import { FaHome, FaUser, FaEnvelope, FaLock, FaPhone, FaSpinner } from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (searchParams.get("google_error")) {
      setError("Google sign-in failed. Please try again.");
    }
  }, [searchParams]);

  // Same Google Identity Services wiring as LoginPage — redirect mode, not
  // popup, so a browser/extension popup blocker can't silently break this
  // for visitors. See LoginPage.jsx for the full explanation.
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
          text: "signup_with",
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
      await register(formData);
      navigate("/login", {
        state: { message: "Account created! Please sign in." },
      });
    } catch (err) {
      const message = getErrorMessage(err, "Registration failed. Please try again.");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields = [
    { label: "Full Name", name: "full_name", type: "text", icon: FaUser, placeholder: "Rahul Sharma", autoComplete: "name" },
    { label: "Email Address", name: "email", type: "email", icon: FaEnvelope, placeholder: "rahul@example.com", autoComplete: "email" },
    { label: "Password", name: "password", type: "password", icon: FaLock, placeholder: "Min 6 characters", autoComplete: "new-password" },
    { label: "Phone (optional)", name: "phone", type: "tel", icon: FaPhone, placeholder: "9876543210", autoComplete: "tel" },
  ];

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
          <p className="text-muted text-sm mt-2">Create your account</p>
        </div>

        <div className="bg-white rounded-xl p-8 border-2 border-ink">
          <h2 className="text-xl font-bold text-ink mb-6">Create Account</h2>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-650 rounded-lg p-3.5 mb-5 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ label, name, type, icon: Icon, placeholder, autoComplete }) => (
              <div key={name}>
                <label htmlFor={`register-${name}`} className="block text-ink-soft text-xs font-semibold mb-1.5">
                  {label}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-xs" />
                  <input
                    type={type}
                    name={name}
                    id={`register-${name}`}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    required={name !== "phone"}
                    autoComplete={autoComplete}
                    className="w-full border border-line rounded-lg pl-9 pr-4 py-2.5 text-ink placeholder-faint text-sm focus:outline-none focus:border-ink transition bg-white"
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              id="register-submit"
              disabled={isSubmitting}
              className="w-full bg-ink hover:bg-accent-hover disabled:bg-ink-soft disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <><FaSpinner className="animate-spin text-xs" /> Creating Account...</>
              ) : (
                "Create Account"
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
            Already have an account?{" "}
            <Link to="/login" className="text-ink hover:underline">
              Sign In
            </Link>
          </p>
          <p className="text-center text-faint mt-3 text-[11px]">
            Want to list properties too? You can activate a seller profile on this same account anytime from your profile page.
          </p>
        </div>
      </div>
    </div>
  );
}
