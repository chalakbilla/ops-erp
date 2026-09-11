export function GlassCard({ children, className = "", strong = false }) {
  return (
    <div className={`${strong ? "glass-strong" : "glass"} rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function GlassInput({ className = "", ...props }) {
  return (
    <input
      className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/40 transition ${className}`}
      {...props}
    />
  );
}

export function GlassSelect({ className = "", children, ...props }) {
  return (
    <select
      className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white transition ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      className={`rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const STATUS_STYLES = {
  assigned: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  in_progress: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  completed: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  requested: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  dispatched: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  received: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  reserved: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  cancelled: "bg-rose-400/15 text-rose-300 border-rose-400/30",
  fulfilled: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-white/10 text-white/70 border-white/20";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${style}`}>
      {status?.replace("_", " ")}
    </span>
  );
}
