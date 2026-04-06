import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      navigate("/dashboard");
    }
    setSubmitting(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          "linear-gradient(135deg, #ff4f86 0%, #ff7bb8 25%, #c38bff 50%, #8a9dff 75%, #7bc9ff 100%)",
      }}
    >
      <div className="w-full max-w-md text-center text-white">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-indigo-900 p-6 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="white"
              className="w-10 h-10"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21h18M5 21V9a1 1 0 011-1h2m8 0h2a1 1 0 011 1v12M9 21V5a1 1 0 011-1h4a1 1 0 011 1v16"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-semibold tracking-wide">Parkside Motel</h1>
        <p className="mb-10 text-sm text-white/80">Staff Portal</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Email */}
          <div className="relative text-left">
            <span className="absolute left-1 top-3 text-white/85">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            </span>
            <input
              id="email"
              type="email"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-0 border-b border-white/45 bg-transparent pb-2.5 pl-8 pt-1 text-sm text-white placeholder:text-white/75 focus:outline-none focus:border-white/80"
            />
          </div>

          {/* Password */}
          <div className="relative text-left">
            <span className="absolute left-1 top-3 text-white/85">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 12V9a4 4 0 10-8 0v3m-2 0h12v8H6v-8z"
                />
              </svg>
            </span>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-0 border-b border-white/45 bg-transparent pb-2.5 pl-8 pt-1 text-sm text-white placeholder:text-white/75 focus:outline-none focus:border-white/80"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm bg-white/20 rounded-lg p-2.5 text-white">{error}</p>
          )}

          {/* Options */}
          <div className="flex items-center justify-between text-xs text-white/85">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3 w-3 rounded border-white/40 bg-transparent accent-white"
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="underline underline-offset-2">
              Forgot password?
            </Link>
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-full text-white text-lg font-semibold bg-gradient-to-r from-pink-500 to-red-400 shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
