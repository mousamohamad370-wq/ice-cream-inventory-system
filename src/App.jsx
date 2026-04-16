import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import PublicMenu from "./pages/PublicMenu";

import EmployeeForm from "./pages/EmployeeForm";
import IncomingDelivery from "./pages/IncomingDelivery";
import TalabiyahHelper from "./pages/TalabiyahHelper";

import AdminAssign from "./pages/AdminAssign";
import AdminExport from "./pages/AdminExport";
import AdminMenu from "./pages/AdminMenu";

function ProtectedPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    document.body.setAttribute("dir", "rtl");
    document.body.classList.add("rtl");

    return () => {
      document.body.classList.remove("rtl");
    };
  }, []);

  return (
    <div className="app-root" dir="rtl" lang="ar">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/menu" element={<PublicMenu />} />

        <Route
          path="/employee"
          element={
            <ProtectedPage>
              <EmployeeForm />
            </ProtectedPage>
          }
        />
        <Route
          path="/employee/incoming"
          element={
            <ProtectedPage>
              <IncomingDelivery />
            </ProtectedPage>
          }
        />
        <Route
          path="/employee/order"
          element={
            <ProtectedPage>
              <TalabiyahHelper />
            </ProtectedPage>
          }
        />

        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedPage>
              <AdminExport />
            </ProtectedPage>
          }
        />
        <Route
          path="/admin/menu"
          element={
            <ProtectedPage>
              <AdminMenu />
            </ProtectedPage>
          }
        />
        <Route
          path="/admin/assign"
          element={
            <ProtectedPage>
              <AdminAssign />
            </ProtectedPage>
          }
        />
        <Route path="/admin/export" element={<Navigate to="/admin/dashboard" replace />} />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}