import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GlassCard, GlassInput, PrimaryButton } from "../components/Glass";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/inventory" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/inventory");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="aurora-bg" />

      <GlassCard strong className="w-full max-w-sm p-8">
        <p className="text-2xl font-semibold tracking-tight">
          <span className="gradient-text">Meridian</span> ERP
        </p>
        <p className="mt-1 text-sm text-white/50">Sign in to manage operations</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Username</label>
            <GlassInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Password</label>
            <GlassInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}

          <PrimaryButton type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </PrimaryButton>
        </form>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/45">
          <p className="mb-1 font-medium text-white/60">Demo accounts</p>
          <p>admin / Admin@123</p>
          <p>ops / Ops@123</p>
          <p>sales / Sales@123</p>
        </div>
      </GlassCard>
    </div>
  );
}
