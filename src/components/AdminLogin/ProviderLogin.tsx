import React from "react";
import { FaGithub } from "react-icons/fa";
import { loginUrl, logoutUrl } from "@/services/api/session";

interface ProviderLoginProps {
  theme: string;
  /** SWA user id of someone signed in who isn't the admin (yet). */
  signedInId?: string | null;
}

/**
 * Admin sign-in through Static Web Apps: GitHub only. Whether the account is the admin is decided on the
 * server (/api/get-roles).
 */
const ProviderLogin: React.FC<ProviderLoginProps> = ({ theme, signedInId }) => {
  const dk = theme === "dark";
  const button = `w-full border font-medium py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg ${
    dk
      ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 hover:from-oceanic-500 hover:to-oceanic-900 text-white shadow-oceanic-500/20"
      : "bg-gradient-to-r from-oceanic-600 to-oceanic-700 border-oceanic-500/50 hover:from-oceanic-700 hover:to-oceanic-800 text-white shadow-oceanic-500/20"
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
        <div
          role="alert"
          className={`text-sm space-y-1 ${dk ? "text-error-400" : "text-error-700"}`}
        >
          <p>You&apos;re signed in, but this account isn&apos;t the site admin.</p>
          <p>
            Setting up? Your sign-in id is <code className="break-all">{signedInId}</code>. Add it
            to <code>ADMIN_USER_IDS</code> in the Static Web App&apos;s environment variables, then
            sign out and in again.
          </p>
        </div>
      )}
      <a href={loginUrl("github")} className={button}>
        <FaGithub /> Sign in with GitHub
      </a>
      {signedInId && (
        <p className="text-sm text-center">
          <a
            href={logoutUrl()}
            className={`underline underline-offset-2 ${dk ? "text-slate-300" : "text-slate-700"}`}
          >
            Sign out
          </a>
        </p>
      )}
    </div>
  );
};

export default ProviderLogin;
