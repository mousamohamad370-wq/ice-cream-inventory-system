import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Navigate, useLocation } from "react-router-dom";
import { auth, isAdmin } from "../firebaseConfig";

function buildReturnPath(location) {
  const pathname = location?.pathname || "/";
  const search = location?.search || "";
  const hash = location?.hash || "";
  return `${pathname}${search}${hash}`;
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentPath = useMemo(() => location.pathname || "", [location.pathname]);
  const returnPath = useMemo(() => buildReturnPath(location), [location]);

  if (loading) {
    return (
      <div className="page" dir="rtl">
        <div className="card">
          <h3 className="title">جاري التحقق من الجلسة...</h3>
          <p className="muted">يتم التأكد من تسجيل الدخول والصلاحيات</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: returnPath }} />;
  }

  const email = String(user.email || "").toLowerCase().trim();
  const admin = isAdmin(email);

  if (currentPath.startsWith("/admin") && !admin) {
    return <Navigate to="/employee" replace />;
  }

  if (currentPath.startsWith("/employee") && admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}