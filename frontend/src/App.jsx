import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import Inventory from "./pages/Inventory";
import WorkOrders from "./pages/WorkOrders";
import Transfers from "./pages/Transfers";
import Orders from "./pages/Orders";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/work-orders" element={<WorkOrders />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/orders" element={<Orders />} />
            </Route>

            <Route path="/" element={<Navigate to="/inventory" replace />} />
            <Route path="*" element={<Navigate to="/inventory" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
