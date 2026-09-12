import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GlassCard, PrimaryButton } from "../components/Glass";

/* ---------------------------------- icons ---------------------------------- */

function IconUser(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M10 10a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 17c.9-3 3.4-4.75 6.5-4.75S15.6 14 16.5 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconLock(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <rect x="4.25" y="8.75" width="11.5" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 8.75V6.25a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconEye(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M1.5 10S4.5 4.25 10 4.25 18.5 10 18.5 10 15.5 15.75 10 15.75 1.5 10 1.5 10Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconEyeOff(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M2.5 2.5l15 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8.3 4.6c.55-.1 1.12-.15 1.7-.15 5.5 0 8.5 5.75 8.5 5.75a13.4 13.4 0 0 1-2.87 3.6M5.6 5.98A13.6 13.6 0 0 0 1.5 10s3 5.75 8.5 5.75c1.1 0 2.1-.23 3-.62" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.2 11.8a2.25 2.25 0 0 0 3.1-3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowRight(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBolt(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M11 2 4 12h5l-1 6 7-10h-5l1-6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function IconLayers(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path d="m10 2.5 7.5 3.9L10 10.3 2.5 6.4 10 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m2.5 10.4 7.5 3.9 7.5-3.9M2.5 14.3l7.5 3.9 7.5-3.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M10 2.5 16.5 5v4.6c0 4-2.7 6.9-6.5 8.4-3.8-1.5-6.5-4.4-6.5-8.4V5L10 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m7.3 10 1.9 1.9 3.6-3.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* --------------------------------- socials --------------------------------- */

function SocialButton({ symbol, label }) {
  return (
    <button
      type="button"
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-space-950 transition hover:bg-white"
    >
      <svg className="h-4 w-4">
        <use href={`/icons.svg#${symbol}`} />
      </svg>
    </button>
  );
}

/* ----------------------------- live stock bars ------------------------------ */

const BARS = [38, 62, 45, 80, 54, 70, 91, 60];

function PulseChart() {
  return (
    <div className="flex h-16 items-end gap-1.5">
      {BARS.map((h, i) => (
        <div
          key={i}
          className="w-full rounded-full bg-gradient-to-t from-aurora-blue/70 to-aurora-cyan"
          style={{ height: `${h}%`, opacity: 0.45 + (i / BARS.length) * 0.55 }}
        />
      ))}
    </div>
  );
}

/* ----------------------------------- page ----------------------------------- */

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

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
    <div className="relative flex min-h-screen">
      <div className="aurora-bg" />

      {/* ---------------- left showcase panel ---------------- */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16">
        {/* backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-space-900 via-space-950 to-black" />
        <div
          className="absolute inset-0 -z-10 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "radial-gradient(ellipse 70% 60% at 30% 20%, black 40%, transparent 100%)",
          }}
        />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-aurora-violet/30 blur-[100px]" />
        <div className="pointer-events-none absolute -right-10 bottom-10 h-64 w-64 animate-pulse rounded-full bg-aurora-blue/25 blur-[100px]" />
        <svg className="pointer-events-none absolute right-10 top-24 h-40 w-40 animate-spin text-white/[0.06]" style={{ animationDuration: "40s" }} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="1" strokeDasharray="1 5" />
        </svg>

        {/* logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-aurora-blue to-aurora-violet shadow-glass-sm">
            <IconLayers className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Meridian</span>
        </div>

        {/* headline + floating dashboard mock */}
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-[1.15] tracking-tight text-white xl:text-[2.75rem]">
            Your warehouse floor,
            <br />
            <span className="gradient-text">read in real time.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/50">
            Stock levels, transfers and work orders stay in sync across every location the moment
            something changes.
          </p>

          <div className="relative mt-10 max-w-sm">
            <GlassCard strong className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/45">Stock movement</p>
                  <p className="mt-0.5 text-2xl font-semibold text-white">
                    12,480 <span className="text-sm font-normal text-emerald-300">+4.2%</span>
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-aurora-cyan/10 text-aurora-cyan">
                  <IconBolt className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <PulseChart />
              </div>
            </GlassCard>

            <div className="absolute -right-6 -top-6 flex items-center gap-2 rounded-xl border border-white/15 bg-space-900/90 px-3 py-2 shadow-glass backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-medium text-white/70">3 sites synced</span>
            </div>
          </div>
        </div>

        {/* footer trust row */}
        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <IconShield className="h-4 w-4" />
            Encrypted end to end
          </div>
          <div className="flex items-center gap-2">
            <SocialButton symbol="github-icon" label="GitHub" />
            <SocialButton symbol="discord-icon" label="Discord" />
            <SocialButton symbol="x-icon" label="X" />
          </div>
        </div>
      </div>

      {/* ---------------- right form panel ---------------- */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-aurora-blue to-aurora-violet">
            <IconLayers className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Meridian</span>
        </div>

        <GlassCard strong className="w-full max-w-sm p-8">
          <p className="text-2xl font-semibold tracking-tight text-white">Welcome back</p>
          <p className="mt-1 text-sm text-white/50">Sign in to continue to your workspace</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Username</label>
              <div className="relative">
                <IconUser className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  className="glass-input w-full rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-white/40 transition"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-medium text-white/60">Password</label>
                <button
                  type="button"
                  className="text-xs font-medium text-aurora-cyan/80 transition hover:text-aurora-cyan"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <IconLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="glass-input w-full rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/40 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/70"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-white/55">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/25 bg-white/5 accent-aurora-violet"
              />
              Keep me signed in on this device
            </label>

            {error && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </p>
            )}

            <PrimaryButton type="submit" disabled={submitting} className="group mt-2 flex w-full items-center justify-center gap-2">
              {submitting ? "Signing in..." : "Sign in"}
              {!submitting && <IconArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
            </PrimaryButton>
          </form>

          <div className="mt-6 flex items-center gap-3 text-[11px] text-white/30">
            <div className="h-px flex-1 bg-white/10" />
            or continue with
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="mt-4 flex justify-center gap-3">
            <SocialButton symbol="github-icon" label="Continue with GitHub" />
            <SocialButton symbol="discord-icon" label="Continue with Discord" />
            <SocialButton symbol="x-icon" label="Continue with X" />
          </div>

          <button
            type="button"
            onClick={() => setShowDemo((v) => !v)}
            className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white/50 transition hover:bg-white/[0.06]"
          >
            <span className="font-medium text-white/60">Need a demo account?</span>
            <span className="text-white/40">{showDemo ? "Hide" : "Show"}</span>
          </button>
          {showDemo && (
            <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/45">
              <p>admin / Admin@123</p>
              <p>ops / Ops@123</p>
              <p>sales / Sales@123</p>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-white/40">
            Don't have access yet?{" "}
            <button type="button" className="font-medium text-aurora-cyan/90 hover:text-aurora-cyan">
              Ask your workspace admin
            </button>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
