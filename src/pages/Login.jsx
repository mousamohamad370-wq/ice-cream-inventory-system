import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, ADMIN_EMAILS } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  const onLogin = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const userEmail = cred.user?.email || "";

      // إذا ايميل الأدمن ضمن القائمة بروح للـ AdminAssign
    if (ADMIN_EMAILS.includes(userEmail)) {
  nav("/admin/export"); // صفحة تنزيل الإكسل
} else {
  nav("/employee");
}
    } catch (e2) {
      console.error("LOGIN ERROR:", e2);
      setMsg(`❌ ${e2.code || ""} ${e2.message || ""}`);
    }
  };

  const onLogout = async () => {
    await signOut(auth);
    setMsg("Logged out");
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">IceCream Inventory</h1>
        <p className="muted">Login</p>

        <form onSubmit={onLogin} className="form">
          <label className="label">Email</label>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
          />

          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
          />

          <button className="btn" type="submit">Login</button>
          <button className="btn ghost" type="button" onClick={onLogout}>Logout</button>

          {msg && <div className="alert">{msg}</div>}
          {/* <div className="hint">
            إذا ظهر <b>auth/api-key-not-valid</b> → المشكلة من <b>.env</b> أو من مشروع Firebase مختلف.
          </div> */}
        </form>
      </div>
    </div>
  );
}