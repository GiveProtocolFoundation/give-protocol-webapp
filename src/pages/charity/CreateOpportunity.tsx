import React, { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { OpportunityForm } from "@/components/volunteer/OpportunityForm";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Page component for creating a new volunteer opportunity.
 * @returns React element with the opportunity creation form
 */
const CreateOpportunity: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSuccess = useCallback(() => {
    navigate("/charity-portal");
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("common.back", "Back")}
      </Button>

      <OpportunityForm onSuccess={handleSuccess} />
    </div>
  );
};

export default CreateOpportunity;
