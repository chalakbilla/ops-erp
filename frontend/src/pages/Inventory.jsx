import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { GlassCard, GlassInput, PrimaryButton, GhostButton } from "../components/Glass";

const EMPTY_FORM = { item: "", category: "", location: "", batch: "DEFAULT", physical_qty: "" };

export default function Inventory() {
  const { user } = useAuth();
  const { push } = useToast();
  const canManage = user.role === "admin" || user.role === "operations";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [adjusting, setAdjusting] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await api.listInventory());
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
      await api.createInventory({
        ...form,
        physical_qty: Number(form.physical_qty || 0),
      });
      push("Inventory item created", "success");
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function adjust(row, delta) {
    setAdjusting(row.id);
    try {
      await api.adjustInventory(row.id, { physical_qty_delta: delta });
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setAdjusting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-white/50">
          Physical, reserved and available stock across every location.
        </p>
      </div>

      {canManage && (
        <GlassCard className="p-5">
          <p className="mb-4 text-sm font-medium text-white/80">Add inventory item</p>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <GlassInput
              placeholder="Item"
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
              required
            />
            <GlassInput
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
            <GlassInput
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
            <GlassInput
              placeholder="Batch"
              value={form.batch}
              onChange={(e) => setForm({ ...form, batch: e.target.value })}
            />
            <GlassInput
              type="number"
              min="0"
              placeholder="Physical qty"
              value={form.physical_qty}
              onChange={(e) => setForm({ ...form, physical_qty: e.target.value })}
              required
            />
            <PrimaryButton type="submit" disabled={creating} className="col-span-2 md:col-span-1">
              {creating ? "Adding…" : "Add item"}
            </PrimaryButton>
          </form>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Physical</th>
                <th className="px-5 py-3 font-medium">Reserved</th>
                <th className="px-5 py-3 font-medium">Available</th>
                {canManage && <th className="px-5 py-3 font-medium">Adjust</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-white/40">
                    Loading inventory…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-white/40">
                    No inventory yet.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 font-medium">{row.item}</td>
                  <td className="px-5 py-3 text-white/60">{row.category}</td>
                  <td className="px-5 py-3 text-white/60">{row.location}</td>
                  <td className="px-5 py-3 text-white/60">{row.batch}</td>
                  <td className="px-5 py-3">{row.physical_qty}</td>
                  <td className="px-5 py-3">{row.reserved_qty}</td>
                  <td className="px-5 py-3">
                    <span
                      className={row.available_qty <= 0 ? "text-rose-300" : "text-emerald-300"}
                    >
                      {row.available_qty}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <GhostButton
                          className="px-2.5 py-1 text-xs"
                          disabled={adjusting === row.id}
                          onClick={() => adjust(row, 10)}
                        >
                          +10
                        </GhostButton>
                        <GhostButton
                          className="px-2.5 py-1 text-xs"
                          disabled={adjusting === row.id}
                          onClick={() => adjust(row, -10)}
                        >
                          -10
                        </GhostButton>
                      </div>
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
