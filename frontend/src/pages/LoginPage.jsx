import { useState } from "react";
import { FaHome, FaEnvelope, FaLock, FaSpinner } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

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
      const message = err.response?.data?.detail || "Login failed. Please check your credentials.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <FaHome className="text-zinc-900 text-3xl" />
            <span className="text-2xl font-bold tracking-tight text-zinc-900">
              EVA <span className="font-light text-zinc-500">HOMES</span>
            </span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Sign in to your real estate portal</p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-zinc-200 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900 mb-6">Welcome Back</h2>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-650 rounded-lg p-3.5 mb-5 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-600 text-xs font-semibold mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs" />
                <input
                  type="email"
                  name="email"
                  id="login-email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@domain.com"
                  required
                  className="w-full border border-zinc-200 rounded-lg pl-9 pr-4 py-2.5 text-zinc-800 placeholder-zinc-400 text-sm focus:outline-none focus:border-zinc-400 transition bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-600 text-xs font-semibold mb-1.5">
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs" />
                <input
                  type="password"
                  name="password"
                  id="login-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full border border-zinc-200 rounded-lg pl-9 pr-4 py-2.5 text-zinc-800 placeholder-zinc-400 text-sm focus:outline-none focus:border-zinc-400 transition bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={isSubmitting}
              className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
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

          <p className="text-center text-zinc-550 mt-6 text-xs font-medium">
            Don't have an account?{" "}
            <Link to="/register" className="text-zinc-900 hover:underline">
              Create Account
            </Link>
          </p>

          <div className="mt-6 bg-zinc-50 border border-zinc-150 rounded-lg p-3.5 text-[11px] text-zinc-500">
            <p className="font-semibold text-zinc-700 mb-1">Demo Credentials:</p>
            <p>Email: rahul@example.com</p>
            <p>Password: password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
