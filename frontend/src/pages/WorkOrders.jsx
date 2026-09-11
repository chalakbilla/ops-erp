import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  GlassCard,
  GlassInput,
  GlassSelect,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "../components/Glass";

const EMPTY_FORM = { location: "", item: "", required_qty: "", assigned_user_id: "" };
const NEXT_STATUS = { assigned: "in_progress", in_progress: "completed" };

export default function WorkOrders() {
  const { user } = useAuth();
  const { push } = useToast();
  const isAdmin = user.role === "admin";
  const canAdvance = user.role === "admin" || user.role === "operations";

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [advancing, setAdvancing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await api.listWorkOrders());
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (isAdmin) {
      api
        .listUsers()
        .then((all) => setUsers(all.filter((u) => u.role !== "sales")))
        .catch(() => {});
    }
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createWorkOrder({
        ...form,
        required_qty: Number(form.required_qty || 0),
        assigned_user_id: Number(form.assigned_user_id),
      });
      push("Work order created", "success");
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function advance(row) {
    const next = NEXT_STATUS[row.status];
    if (!next) return;
    setAdvancing(row.id);
    try {
      await api.updateWorkOrderStatus(row.id, next);
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Work Orders</h1>
        <p className="mt-1 text-sm text-white/50">
          Material requirements and shortage are calculated automatically per location.
        </p>
      </div>

      {isAdmin && (
        <GlassCard className="p-5">
          <p className="mb-4 text-sm font-medium text-white/80">Create work order</p>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <GlassInput
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
            <GlassInput
              placeholder="Item"
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
              required
            />
            <GlassInput
              type="number"
              min="1"
              placeholder="Required qty"
              value={form.required_qty}
              onChange={(e) => setForm({ ...form, required_qty: e.target.value })}
              required
            />
            <GlassSelect
              value={form.assigned_user_id}
              onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })}
              required
            >
              <option value="" disabled>
                Assign to…
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-space-900">
                  {u.username} ({u.role})
                </option>
              ))}
            </GlassSelect>
            <PrimaryButton type="submit" disabled={creating} className="col-span-2 md:col-span-1">
              {creating ? "Creating…" : "Create"}
            </PrimaryButton>
          </form>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Required</th>
                <th className="px-5 py-3 font-medium">Shortage</th>
                <th className="px-5 py-3 font-medium">Assigned</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {canAdvance && <th className="px-5 py-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-white/40">
                    Loading work orders…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-white/40">
                    No work orders yet.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-white/60">{row.location}</td>
                  <td className="px-5 py-3 font-medium">{row.item}</td>
                  <td className="px-5 py-3">{row.required_qty}</td>
                  <td className="px-5 py-3">
                    <span className={row.shortage > 0 ? "text-rose-300" : "text-emerald-300"}>
                      {row.shortage}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white/60">{row.assigned_user}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  {canAdvance && (
                    <td className="px-5 py-3">
                      {NEXT_STATUS[row.status] ? (
                        <GhostButton
                          className="px-3 py-1.5 text-xs"
                          disabled={advancing === row.id}
                          onClick={() => advance(row)}
                        >
                          Mark {NEXT_STATUS[row.status].replace("_", " ")}
                        </GhostButton>
                      ) : (
                        <span className="text-xs text-white/30">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
