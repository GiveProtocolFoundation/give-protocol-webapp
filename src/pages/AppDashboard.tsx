import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DiscoveryShellSkeleton } from "@/components/discovery/DiscoveryShellSkeleton";
import { PublicDiscoveryView } from "@/components/discovery/PublicDiscoveryView";
import { usePageTitle } from "@/hooks/usePageTitle";

const BLOB_DELAY: React.CSSProperties = { animationDelay: "1s" };

/**
 * /browse Discovery Hub. Renders the public discovery view for every visitor;
 * admins are redirected to /admin.
 */
const AppDashboard: React.FC = () => {
  usePageTitle("Browse");
  const { userType, loading } = useAuth();

  if (userType === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="relative min-h-[calc(100vh-60px)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50 dark:from-[#050A09] dark:via-emerald-950 dark:to-[#050A09]" />
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-200/20 dark:bg-emerald-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div
        className="absolute -bottom-20 -right-20 w-96 h-96 bg-teal-200/20 dark:bg-teal-500/20 rounded-full blur-3xl animate-pulse pointer-events-none"
        style={BLOB_DELAY}
      />
      <div className="relative z-10">
        {loading ? <DiscoveryShellSkeleton /> : <PublicDiscoveryView />}
      </div>
    </div>
  );
};

export default AppDashboard;
