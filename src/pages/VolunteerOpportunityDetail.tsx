import React, { useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CalendarCheck,
  Clock,
  Globe,
  MapPin,
  Users,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { VolunteerApplicationForm } from "../components/volunteer/VolunteerApplicationForm";
import { useTranslation } from "@/hooks/useTranslation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useVolunteerOpportunity,
  type VolunteerOpportunityItem,
} from "@/hooks/useVolunteerOpportunities";
import { sanitizeOpportunityHtml, splitLines } from "@/utils/opportunityText";

/** Converts a snake_case language code to Title Case display name */
const formatLanguageName = (language: string): string =>
  language
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/**
 * Formats a YYYY-MM-DD date for display without shifting it by timezone.
 * @param isoDate - Date string from a DATE column
 * @param locale - BCP 47 locale for formatting
 * @returns Localized long date
 */
function formatDate(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Whether the application deadline (inclusive, UTC date) has passed.
 * @param deadline - YYYY-MM-DD or null
 * @returns True when applications are closed
 */
function isPastDeadline(deadline: string | null): boolean {
  if (deadline === null) return false;
  return deadline < new Date().toISOString().slice(0, 10);
}

interface FactProps {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}

/** One labeled row in the "at a glance" panel. */
function Fact({ icon: Icon, label, children }: FactProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        aria-hidden="true"
        className="h-5 w-5 mt-0.5 text-emerald-700 shrink-0"
      />
      <div>
        <dt className="text-xs uppercase tracking-wide text-gray-500">
          {label}
        </dt>
        <dd className="text-gray-900">{children}</dd>
      </div>
    </div>
  );
}

/** Bulleted list for one-item-per-line text fields. */
function BulletSection({
  title,
  text,
}: {
  title: string;
  text: string | null;
}) {
  const items = splitLines(text);
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      <ul className="list-disc pl-6 space-y-1 text-gray-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

/** At-a-glance panel with the structured details of an opportunity. */
function OpportunityFacts({
  opportunity,
}: {
  opportunity: VolunteerOpportunityItem;
}) {
  const { t, language } = useTranslation();
  const typeLabel = t(
    `volunteer.type.${opportunity.type === "onsite" ? "onSite" : opportunity.type}`,
    opportunity.type,
  );
  return (
    <dl className="grid gap-4 sm:grid-cols-2 bg-gray-50 rounded-lg p-5">
      <Fact
        icon={Clock}
        label={t("volunteer.detail.commitment", "Time commitment")}
      >
        {opportunity.commitment}
      </Fact>
      {opportunity.schedule !== null && (
        <Fact
          icon={CalendarDays}
          label={t("volunteer.field.schedule", "Schedule")}
        >
          {opportunity.schedule}
        </Fact>
      )}
      <Fact icon={MapPin} label={t("volunteer.detail.location", "Location")}>
        {opportunity.location} · {typeLabel}
      </Fact>
      <Fact icon={Globe} label={t("volunteer.detail.language", "Language")}>
        {t(
          `language.${opportunity.workLanguage}`,
          formatLanguageName(opportunity.workLanguage),
        )}
      </Fact>
      {opportunity.startDate !== null && (
        <Fact
          icon={CalendarDays}
          label={t("volunteer.field.startDate", "Start date")}
        >
          {formatDate(opportunity.startDate, language)}
        </Fact>
      )}
      <Fact
        icon={CalendarDays}
        label={t("volunteer.field.endDate", "End date")}
      >
        {opportunity.endDate !== null
          ? formatDate(opportunity.endDate, language)
          : t("volunteer.detail.ongoing", "Ongoing")}
      </Fact>
      {opportunity.applicationDeadline !== null && (
        <Fact
          icon={CalendarCheck}
          label={t(
            "volunteer.field.applicationDeadline",
            "Application deadline",
          )}
        >
          {formatDate(opportunity.applicationDeadline, language)}
        </Fact>
      )}
      {opportunity.volunteersNeeded !== null && (
        <Fact
          icon={Users}
          label={t("volunteer.field.volunteersNeeded", "Volunteers needed")}
        >
          {opportunity.volunteersNeeded}
        </Fact>
      )}
      {opportunity.minimumAge !== null && (
        <Fact
          icon={Users}
          label={t("volunteer.field.minimumAge", "Minimum age")}
        >
          {`${opportunity.minimumAge}+`}
        </Fact>
      )}
    </dl>
  );
}

/** Requirement flags shown as chips (background check, training). */
function OpportunityFlags({
  opportunity,
}: {
  opportunity: VolunteerOpportunityItem;
}) {
  const { t } = useTranslation();
  if (!opportunity.backgroundCheckRequired && !opportunity.trainingProvided) {
    return null;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {opportunity.backgroundCheckRequired && (
        <li className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-50 text-amber-900 border border-amber-200">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 mr-1.5" />
          {t(
            "volunteer.field.backgroundCheckRequired",
            "Background check required",
          )}
        </li>
      )}
      {opportunity.trainingProvided && (
        <li className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-emerald-50 text-emerald-900 border border-emerald-200">
          <GraduationCap aria-hidden="true" className="h-4 w-4 mr-1.5" />
          {t("volunteer.field.trainingProvided", "Training provided")}
        </li>
      )}
    </ul>
  );
}

/**
 * Full detail view for a single volunteer opportunity.
 * @returns VolunteerOpportunityDetail page element
 */
const VolunteerOpportunityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { opportunity, loading, error } = useVolunteerOpportunity(id);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  usePageTitle(opportunity?.title ?? "Volunteer Opportunity");

  const descriptionHtml = useMemo(
    () =>
      opportunity === null
        ? ""
        : sanitizeOpportunityHtml(opportunity.description),
    [opportunity],
  );

  const handleApply = useCallback(() => {
    if (!user) {
      showToast(
        "error",
        t(
          "volunteer.signInToApply",
          "Please sign in to apply for volunteer opportunities",
        ),
      );
      navigate("/auth");
      return;
    }
    setShowApplicationForm(true);
  }, [user, navigate, showToast, t]);

  const handleApplicationClose = useCallback(() => {
    setShowApplicationForm(false);
  }, []);

  const handleApplicationSuccess = useCallback(() => {
    showToast(
      "success",
      t("volunteer.applicationSuccess", "Application submitted successfully!"),
    );
    setShowApplicationForm(false);
  }, [showToast, t]);

  const backLink = (
    <Link
      to="/opportunities"
      className="inline-flex items-center text-sm text-emerald-700 hover:text-emerald-900 mb-4"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-1" />
      {t("volunteer.backToOpportunities", "Back to opportunities")}
    </Link>
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div role="status" className="text-center py-12 text-gray-500">
          {t("volunteer.loadingOpportunities", "Loading opportunities...")}
        </div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {backLink}
        <div role="alert" className="text-center py-12 text-red-700">
          {t(
            "volunteer.loadOpportunitiesError",
            "We couldn't load volunteer opportunities. Please try again later.",
          )}
        </div>
      </div>
    );
  }

  if (opportunity === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {backLink}
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t("volunteer.detail.notFoundTitle", "Opportunity not found")}
          </h1>
          <p className="text-gray-600">
            {t(
              "volunteer.detail.notFoundMessage",
              "This opportunity may have been filled or removed.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const closed = isPastDeadline(opportunity.applicationDeadline);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {backLink}

      <img
        src={opportunity.imageUrl}
        alt=""
        className="w-full h-64 object-cover rounded-lg"
      />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          {opportunity.title}
        </h1>
        {opportunity.organization !== "" && (
          <p className="text-gray-700">
            {t("volunteer.detail.hostedBy", "Hosted by")}{" "}
            {opportunity.charityPath !== undefined ? (
              <Link
                to={opportunity.charityPath}
                className="font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                {opportunity.organization}
              </Link>
            ) : (
              <span className="font-medium">{opportunity.organization}</span>
            )}
          </p>
        )}
      </header>

      <OpportunityFacts opportunity={opportunity} />
      <OpportunityFlags opportunity={opportunity} />

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          {t("volunteer.detail.about", "About this opportunity")}
        </h2>
        <div
          className="prose max-w-none text-gray-700"
          // Sanitized with DOMPurify (allow-listed formatting tags only)
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      </section>

      <BulletSection
        title={t("volunteer.field.requirements", "Requirements")}
        text={opportunity.requirements}
      />
      <BulletSection
        title={t("volunteer.field.benefits", "Benefits")}
        text={opportunity.benefits}
      />

      {opportunity.skills.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            {t("volunteer.detail.skills", "Skills needed")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {opportunity.skills.map((skill) => (
              <li
                key={skill}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
              >
                <Award aria-hidden="true" className="h-3 w-3 mr-1" />
                {skill}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={handleApply}
        disabled={closed}
        className="w-full sm:w-auto bg-emerald-700 text-white px-8 py-3 rounded-md hover:bg-emerald-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {closed
          ? t("volunteer.detail.applicationsClosed", "Applications closed")
          : t("volunteer.applyNow", "Apply Now")}
      </button>

      {showApplicationForm && (
        <VolunteerApplicationForm
          opportunityId={opportunity.id}
          opportunityTitle={opportunity.title}
          charityId={opportunity.charityId}
          onClose={handleApplicationClose}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </div>
  );
};

export default VolunteerOpportunityDetail;
