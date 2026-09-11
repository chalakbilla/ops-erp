const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("ops_erp_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("ops_erp_token", token);
  else localStorage.removeItem("ops_erp_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // no body
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.details = data && data.details;
    throw error;
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password }, auth: false }),
  me: () => request("/auth/me"),
  listUsers: () => request("/auth/users"),

  listInventory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory${qs ? `?${qs}` : ""}`);
  },
  createInventory: (payload) => request("/inventory", { method: "POST", body: payload }),
  adjustInventory: (id, payload) => request(`/inventory/${id}`, { method: "PATCH", body: payload }),

  listWorkOrders: () => request("/work-orders"),
  createWorkOrder: (payload) => request("/work-orders", { method: "POST", body: payload }),
  updateWorkOrderStatus: (id, status) =>
    request(`/work-orders/${id}/status`, { method: "PATCH", body: { status } }),

  listTransfers: () => request("/transfers"),
  createTransfer: (payload) => request("/transfers", { method: "POST", body: payload }),
  dispatchTransfer: (id) => request(`/transfers/${id}/dispatch`, { method: "POST" }),
  receiveTransfer: (id) => request(`/transfers/${id}/receive`, { method: "POST" }),

  listOrders: () => request("/orders"),
  createOrder: (payload) => request("/orders", { method: "POST", body: payload }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: "POST" }),
};
