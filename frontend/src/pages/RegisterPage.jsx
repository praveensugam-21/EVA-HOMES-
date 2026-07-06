import { useState } from "react";
import { FaHome, FaUser, FaEnvelope, FaLock, FaPhone, FaSpinner } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
      const message = err.response?.data?.detail || "Registration failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields = [
    { label: "Full Name", name: "full_name", type: "text", icon: FaUser, placeholder: "Rahul Sharma" },
    { label: "Email Address", name: "email", type: "email", icon: FaEnvelope, placeholder: "rahul@example.com" },
    { label: "Password", name: "password", type: "password", icon: FaLock, placeholder: "Min 6 characters" },
    { label: "Phone (optional)", name: "phone", type: "tel", icon: FaPhone, placeholder: "9876543210" },
  ];

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
          <p className="text-zinc-500 text-sm mt-2">Create your account</p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-zinc-200 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900 mb-6">Create Account</h2>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-650 rounded-lg p-3.5 mb-5 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ label, name, type, icon: Icon, placeholder }) => (
              <div key={name}>
                <label className="block text-zinc-650 text-xs font-semibold mb-1.5">
                  {label}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs" />
                  <input
                    type={type}
                    name={name}
                    id={`register-${name}`}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    required={name !== "phone"}
                    className="w-full border border-zinc-200 rounded-lg pl-9 pr-4 py-2.5 text-zinc-850 placeholder-zinc-400 text-sm focus:outline-none focus:border-zinc-400 transition bg-white"
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              id="register-submit"
              disabled={isSubmitting}
              className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <><FaSpinner className="animate-spin text-xs" /> Creating Account...</>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-zinc-550 mt-6 text-xs font-medium">
            Already have an account?{" "}
            <Link to="/login" className="text-zinc-900 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
