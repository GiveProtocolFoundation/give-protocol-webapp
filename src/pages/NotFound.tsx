import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logger } from "@/utils/logger";

interface NotFoundProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  onRetry?: () => void;
}

/**
 * Generic 404 / not-found page component.
 * @param props - NotFoundProps
 * @param props.title - Page heading text
 * @param props.message - Descriptive message shown to the user
 * @param props.showHomeButton - Whether to render a home-navigation button
 * @param props.showBackButton - Whether to render a back-navigation button
 * @param props.onRetry - Optional retry callback
 * @returns React element for the not-found state
 */
const NotFound: React.FC<NotFoundProps> = ({
  title = "Page Not Found",
  message = "The page you're looking for doesn't exist or has been moved.",
  showHomeButton = true,
  showBackButton = true,
  onRetry,
}) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Log 404 errors for monitoring
    Logger.warn("404 Error", {
      path: window.location.pathname,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const handleGoHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-2 text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mb-4 text-3xl font-semibold text-gray-800">{title}</h2>
        <p className="mb-8 text-lg text-gray-600">{message}</p>

        <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          {showHomeButton && (
            <Button
              onClick={handleGoHome}
              className="flex items-center justify-center"
            >
              <Home className="mr-2 h-5 w-5" />
              Go Home
            </Button>
          )}

          {showBackButton && (
            <Button
              variant="secondary"
              onClick={handleGoBack}
              className="flex items-center justify-center"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Go Back
            </Button>
          )}

          {onRetry && (
            <Button
              variant="secondary"
              onClick={onRetry}
              className="flex items-center justify-center"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
