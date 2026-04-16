import { useMemo, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, ADMIN_EMAILS } from "../firebaseConfig";
import { useLocation, useNavigate } from "react-router-dom";
import "../style/Login.css";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getFriendlyErrorMessage(error) {
  const code = error?.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "❌ الإيميل مش صحيح";
    case "auth/missing-password":
      return "❌ حط كلمة السر";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "❌ الإيميل أو كلمة السر غلط";
    case "auth/too-many-requests":
      return "❌ في محاولات كتير، جرّب بعد شوي";
    case "auth/network-request-failed":
      return "❌ شيّك على الإنترنت";
    default:
      return "❌ صار خطأ بتسجيل الدخول";
  }
}

function isSafeInternalPath(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasLoginError, setHasLoginError] = useState(false);

  const adminEmailsNormalized = useMemo(
    () => ADMIN_EMAILS.map((item) => normalizeEmail(item)),
    []
  );

  const isKoalaCoveringEyes =
    !showPassword && (isPasswordFocused || pass.length > 0);

  const resolveRedirectPath = (userEmail) => {
    const isAdminUser = adminEmailsNormalized.includes(normalizeEmail(userEmail));
    const requestedPath = isSafeInternalPath(location.state?.from)
      ? location.state.from
      : "";

    if (isAdminUser) {
      return requestedPath.startsWith("/admin")
        ? requestedPath
        : "/admin/dashboard";
    }

    return requestedPath.startsWith("/employee")
      ? requestedPath
      : "/employee";
  };

  const clearFeedback = () => {
    if (msg || hasLoginError) {
      setMsg("");
      setHasLoginError(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    clearFeedback();
  };

  const handlePasswordChange = (e) => {
    setPass(e.target.value);
    clearFeedback();
  };

  const onLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setMsg("");
    setHasLoginError(false);

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setMsg("❌ حط الإيميل");
      setHasLoginError(true);
      return;
    }

    if (!pass) {
      setMsg("❌ حط كلمة السر");
      setHasLoginError(true);
      return;
    }

    try {
      setLoading(true);

      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
      const nextPath = resolveRedirectPath(cred.user?.email);

      setHasLoginError(false);
      setMsg("");
      nav(nextPath, { replace: true });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setMsg(getFriendlyErrorMessage(err));
      setHasLoginError(true);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await signOut(auth);
      setMsg("✅ تم تسجيل الخروج");
      setHasLoginError(false);
      setPass("");
      setShowPassword(false);
      setIsPasswordFocused(false);
    } catch (err) {
      console.error("LOGOUT ERROR:", err);
      setMsg("❌ ما زبط تسجيل الخروج");
      setHasLoginError(true);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    if (loading) return;
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="page" dir="rtl">
      <div className="card login-page-card">
        <div className="login-koala-block" aria-hidden="true">
          <div
            className={[
              "koala",
              isKoalaCoveringEyes ? "password-mode" : "",
              showPassword ? "show-mode" : "",
              hasLoginError ? "error-mode" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="koala-ears">
              <span className="koala-ear koala-ear-left" />
              <span className="koala-ear koala-ear-right" />
            </div>

            <div className="koala-face">
              <div className="koala-eyes">
                <span className="koala-eye" />
                <span className="koala-eye" />
              </div>

              <div className="koala-nose" />
              <div className="koala-mouth" />

              <span className="koala-hand koala-hand-left" />
              <span className="koala-hand koala-hand-right" />
            </div>
          </div>
        </div>

        <div className="login-brand-block">
          <span className="login-brand-badge">Booza Bashir</span>
          <h1 className="title">بوظة بشير</h1>
        </div>

        <form onSubmit={onLogin} className="form" dir="rtl">
          <div>
            <label className="label">الإيميل</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="example@company.com"
              autoComplete="email"
              disabled={loading}
              dir="ltr"
            />
          </div>

          <div>
            <label className="label">كلمة السر</label>

            <div className="login-password-wrap">
              <button
                type="button"
                className="login-password-emoji"
                onClick={togglePasswordVisibility}
                disabled={loading}
                aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
                title={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>

              <input
                className="input"
                type={showPassword ? "text" : "password"}
                value={pass}
                onChange={handlePasswordChange}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                dir="ltr"
              />
            </div>
          </div>

          <div className="login-form-actions">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "عم يتم تسجيل الدخول..." : "دخول"}
            </button>

            <button
              className="btn ghost"
              type="button"
              onClick={onLogout}
              disabled={loading}
            >
              تسجيل الخروج
            </button>
          </div>

          {msg ? <div className="alert">{msg}</div> : null}
        </form>
      </div>
    </div>
  );
}