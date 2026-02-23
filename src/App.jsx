import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import EmployeeForm from "./pages/EmployeeForm";
import AdminAssign from "./pages/AdminAssign";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminExport from "./pages/AdminExport";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/employee"
        element={
          <ProtectedRoute>
            <EmployeeForm />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/export" element={<ProtectedRoute><AdminExport /></ProtectedRoute>} />

      <Route
        path="/admin/assign"
        element={
          <ProtectedRoute>
            <AdminAssign />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin/export"
  element={
    <ProtectedRoute>
      <AdminExport />
    </ProtectedRoute>
  }
/>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}