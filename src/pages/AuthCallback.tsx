import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const SESSION_TIMEOUT_MS = 5000;

/**
 * AuthCallback page — landing point for email verification and OAuth redirects.
 * Supabase JS auto-parses the hash fragment on page load, establishing the session.
 * This component waits briefly for the session to appear then routes the user.
 *
 * @returns {JSX.Element} Loading spinner while verifying, error state on timeout.
 */
const AuthCallback: React.FC = () => {
  const { user, userType, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (userType === "charity") {
        navigate("/charity-portal", { replace: true });
      } else if (userType === "donor") {
        navigate("/give-dashboard", { replace: true });
      } else {
        navigate("/browse", { replace: true });
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, SESSION_TIMEOUT_MS);

    return () => {
      // skipcq: JS-0045 — useEffect cleanup is a valid return value
      clearTimeout(timer);
    };
  }, [user, userType, loading, navigate]);

  if (timedOut && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-3">
            Verification failed
          </h1>
          <p className="text-gray-600 mb-6">
            We could not verify your account. The link may have expired or
            already been used.
          </p>
          <Link
            to="/auth"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium underline"
          >
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 text-sm">Verifying your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
