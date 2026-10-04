import React from "react";
import { FaGithub, FaEnvelope } from "react-icons/fa";
import { loginUrl } from "@/services/api/session";

interface ProviderLoginProps {
  theme: string;
  /** SWA user id of someone signed in who isn't the admin (yet). */
  signedInId?: string | null;
}

/**
 * Admin sign-in through Static Web Apps (used with VITE_DATA_BACKEND=cosmos):
 * GitHub, or email + password on Microsoft's sign-in page, which also handles
 * forgotten passwords. Whether the account is the admin is decided on the
 * server (/api/get-roles).
 */
const ProviderLogin: React.FC<ProviderLoginProps> = ({ theme, signedInId }) => {
  const dk = theme === "dark";
  const button = `w-full border font-medium py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg ${
    dk
      ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 hover:from-oceanic-500 hover:to-oceanic-900 text-white shadow-oceanic-500/20"
      : "bg-gradient-to-r from-blue-500 to-oceanic-500 border-oceanic-500/50 hover:from-blue-600 hover:to-oceanic-600 text-white shadow-oceanic-500/20"
  }`;

  return (
    <div
      className={`border rounded-2xl p-8 shadow-2xl transition-all duration-200 space-y-4 ${
        dk
          ? "bg-gray-800/80 border-gray-700/80 shadow-gray-900/50"
          : "bg-gradient-to-br from-white/80 to-white/60 border-blue-200/40 shadow-blue-200/20"
      }`}
    >
      {signedInId && (
        <div role="alert" className="text-sm text-red-500 space-y-1">
          <p>You&apos;re signed in, but this account isn&apos;t the site admin.</p>
          <p className="break-all">
            Setting up? Your sign-in id is <code>{signedInId}</code>. Add it to{" "}
            <code>ADMIN_USER_IDS</code> in the Static Web App&apos;s environment variables, then
            sign out and in again.
          </p>
        </div>
      )}
      <a href={loginUrl("github")} className={button}>
        <FaGithub /> Sign in with GitHub
      </a>
      <a href={loginUrl("entra")} className={button}>
        <FaEnvelope /> Sign in with email
      </a>
      <p className={`text-xs text-center ${dk ? "text-gray-400" : "text-slate-500"}`}>
        Forgot your password? Use &ldquo;Sign in with email&rdquo; and choose &ldquo;Forgot
        password&rdquo; on the sign-in page.
      </p>
    </div>
  );
};

export default ProviderLogin;
