import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { GlassCard, GlassInput, PrimaryButton, GhostButton, StatusBadge } from "../components/Glass";

const EMPTY_FORM = { source_location: "", destination_location: "", item: "", quantity: "" };

export default function Transfers() {
  const { user } = useAuth();
  const { push } = useToast();
  const canManage = user.role === "admin" || user.role === "operations";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await api.listTransfers());
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
      await api.createTransfer({ ...form, quantity: Number(form.quantity || 0) });
      push("Transfer requested", "success");
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function dispatch(row) {
    setBusyId(row.id);
    try {
      await api.dispatchTransfer(row.id);
      push("Transfer dispatched — source stock reduced", "success");
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function receive(row) {
    setBusyId(row.id);
    try {
      await api.receiveTransfer(row.id);
      push("Transfer received — destination stock updated", "success");
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
        <h1 className="text-2xl font-semibold tracking-tight">Internal Transfers</h1>
        <p className="mt-1 text-sm text-white/50">
          Source stock reduces on dispatch; destination stock only increases after receipt.
        </p>
      </div>

      {canManage && (
        <GlassCard className="p-5">
          <p className="mb-4 text-sm font-medium text-white/80">Request transfer</p>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <GlassInput
              placeholder="Source location"
              value={form.source_location}
              onChange={(e) => setForm({ ...form, source_location: e.target.value })}
              required
            />
            <GlassInput
              placeholder="Destination location"
              value={form.destination_location}
              onChange={(e) => setForm({ ...form, destination_location: e.target.value })}
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
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
            <PrimaryButton type="submit" disabled={creating} className="col-span-2 md:col-span-1">
              {creating ? "Requesting…" : "Request"}
            </PrimaryButton>
          </form>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Destination</th>
                <th className="px-5 py-3 font-medium">Qty</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {canManage && <th className="px-5 py-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-white/40">
                    Loading transfers…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-white/40">
                    No transfers yet.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 font-medium">{row.item}</td>
                  <td className="px-5 py-3 text-white/60">{row.source_location}</td>
                  <td className="px-5 py-3 text-white/60">{row.destination_location}</td>
                  <td className="px-5 py-3">{row.quantity}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  {canManage && (
                    <td className="px-5 py-3">
                      {row.status === "requested" && (
                        <GhostButton
                          className="px-3 py-1.5 text-xs"
                          disabled={busyId === row.id}
                          onClick={() => dispatch(row)}
                        >
                          Dispatch
                        </GhostButton>
                      )}
                      {row.status === "dispatched" && (
                        <GhostButton
                          className="px-3 py-1.5 text-xs"
                          disabled={busyId === row.id}
                          onClick={() => receive(row)}
                        >
                          Receive
                        </GhostButton>
                      )}
                      {row.status === "received" && <span className="text-xs text-white/30">—</span>}
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
