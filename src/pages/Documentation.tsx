import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DOCS_CONFIG } from "@/config/docs";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Documentation page that redirects to the external docs site. */
export const Documentation: React.FC = () => {
  usePageTitle("Documentation");
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to documentation site
    window.location.href = DOCS_CONFIG.url;

    // Fallback navigation if redirect fails
    const fallbackTimeout = setTimeout(() => {
      navigate("/");
    }, 1000);

    return () => clearTimeout(fallbackTimeout);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Redirecting to Documentation...
        </h1>
        <p className="text-gray-600">
          If you are not redirected automatically,{" "}
          <a
            href={DOCS_CONFIG.url}
            className="text-emerald-600 hover:text-emerald-800"
          >
            click here
          </a>
        </p>
      </div>
    </div>
  );
};

export default Documentation;
