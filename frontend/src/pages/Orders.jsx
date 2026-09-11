import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { GlassCard, GlassInput, PrimaryButton, GhostButton, StatusBadge } from "../components/Glass";

const EMPTY_FORM = { customer_name: "", item: "", location: "", quantity: "" };

export default function Orders() {
  const { user } = useAuth();
  const { push } = useToast();
  const canManage = user.role === "admin" || user.role === "sales";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await api.listOrders());
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createOrder({ ...form, quantity: Number(form.quantity || 0) });
      push("Stock reserved for order", "success");
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function cancel(row) {
    setBusyId(row.id);
    try {
      await api.cancelOrder(row.id);
      push("Order cancelled — reserved stock released", "success");
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customer Orders</h1>
        <p className="mt-1 text-sm text-white/50">
          Reserving stock never oversells — concurrent reservations are checked atomically.
        </p>
      </div>

      {canManage && (
        <GlassCard className="p-5">
          <p className="mb-4 text-sm font-medium text-white/80">Create order</p>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <GlassInput
              placeholder="Customer name"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              required
            />
            <GlassInput
              placeholder="Item"
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
              required
            />
            <GlassInput
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
            <GlassInput
              type="number"
              min="1"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
            <PrimaryButton type="submit" disabled={creating} className="col-span-2 md:col-span-1">
              {creating ? "Reserving…" : "Reserve stock"}
            </PrimaryButton>
          </form>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Qty</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {canManage && <th className="px-5 py-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-white/40">
                    Loading orders…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-white/40">
                    No orders yet.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 font-medium">{row.customer_name}</td>
                  <td className="px-5 py-3 text-white/60">{row.item}</td>
                  <td className="px-5 py-3 text-white/60">{row.location}</td>
                  <td className="px-5 py-3">{row.quantity}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  {canManage && (
                    <td className="px-5 py-3">
                      {row.status === "reserved" ? (
                        <GhostButton
                          className="px-3 py-1.5 text-xs"
                          disabled={busyId === row.id}
                          onClick={() => cancel(row)}
                        >
                          Cancel
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
