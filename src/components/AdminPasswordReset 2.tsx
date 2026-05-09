import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from "react-icons/fa";
import useTheme from "@/hooks/useTheme";
import { completePasswordRecovery } from "@/services/api";

const AdminPasswordReset: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { theme: rawTheme } = useTheme();
  const theme = rawTheme === "light" || rawTheme === "dark" ? rawTheme : "dark";
  const dk = theme === "dark";

  const userId = params.get("userId");
  const secret = params.get("secret");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!userId || !secret) {
      setError("Invalid or expired reset link. Request a new one from the login page.");
    }
  }, [userId, secret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!userId || !secret) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await completePasswordRecovery(userId, secret, password);
      setDone(true);
      setTimeout(() => navigate("/admin/dashboard"), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Reset failed. Link may have expired.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        dk
          ? "bg-gradient-to-br from-brand-dark-1 via-brand-dark-2 to-brand-dark-3"
          : "bg-gradient-to-br from-blue-50 via-white to-oceanic-50"
      }`}
    >
      <div className="w-full max-w-md">
        <div
          className={`border rounded-2xl p-8 shadow-2xl ${
            dk
              ? "bg-gray-800/80 border-gray-700/80"
              : "bg-gradient-to-br from-white/80 to-white/60 border-blue-200/40"
          }`}
        >
          <div className="text-center mb-6">
            <div
              className={`inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-3 ${
                dk ? "bg-oceanic-500/20" : "bg-oceanic-100"
              }`}
            >
              <FaLock className={dk ? "text-oceanic-400 text-xl" : "text-oceanic-600 text-xl"} />
            </div>
            <h1 className={`text-2xl font-bold ${dk ? "text-white" : "text-slate-900"}`}>
              Reset Password
            </h1>
            <p className={`text-sm mt-1 ${dk ? "text-slate-400" : "text-slate-600"}`}>
              Enter your new admin password
            </p>
          </div>

          {done ? (
            <div className="text-center py-6">
              <FaCheckCircle className="text-green-400 text-5xl mx-auto mb-3" />
              <p className={`font-semibold ${dk ? "text-white" : "text-slate-900"}`}>
                Password updated
              </p>
              <p className={`text-sm mt-1 ${dk ? "text-slate-400" : "text-slate-600"}`}>
                Redirecting to dashboard…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className={`block text-sm font-medium mb-2 ${dk ? "text-white" : "text-slate-700"}`}
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={loading || !userId || !secret}
                    className={`w-full border rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 ${
                      dk
                        ? "bg-gray-900/80 border-gray-700 text-white placeholder-gray-500 focus:ring-oceanic-500/50"
                        : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500 focus:ring-blue-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                      dk ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {show ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className={`block text-sm font-medium mb-2 ${dk ? "text-white" : "text-slate-700"}`}
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={loading || !userId || !secret}
                  className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 ${
                    dk
                      ? "bg-gray-900/80 border-gray-700 text-white placeholder-gray-500 focus:ring-oceanic-500/50"
                      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500 focus:ring-blue-400"
                  }`}
                />
              </div>

              {error && (
                <div
                  className={`border rounded-lg p-3 ${
                    dk ? "bg-red-500/20 border-red-500/50" : "bg-red-50 border-red-200"
                  }`}
                >
                  <p className={`text-sm ${dk ? "text-red-100" : "text-red-600"}`}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !userId || !secret}
                className="w-full font-medium py-3 rounded-lg bg-gradient-to-r from-oceanic-600 to-oceanic-900 hover:from-oceanic-500 hover:to-oceanic-900 text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <FaLock /> Update Password
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                className={`w-full text-sm ${dk ? "text-oceanic-400 hover:text-oceanic-300" : "text-oceanic-600 hover:text-oceanic-700"}`}
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPasswordReset;
