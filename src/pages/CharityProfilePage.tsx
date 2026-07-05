import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Building2,
  MapPin,
  Share2,
  ChevronDown,
  ChevronUp,
  Globe,
  Mail,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CharityHeroBanner } from "@/components/charity/CharityHeroBanner";
import { UnclaimedProfileBanner } from "@/components/charity/UnclaimedProfileBanner";
import { OrgDetailsCard } from "@/components/charity/OrgDetailsCard";
import { PhotosCard } from "@/components/charity/PhotosCard";
import { DonateWidget } from "@/components/charity/DonateWidget";
import { RequestCharityWidget } from "@/components/charity/RequestCharityWidget";
import { getCharityProfileByEin } from "@/services/charityProfileService";
import { getCharityRecordByEin } from "@/services/charityDataService";
import type { CharityRecord } from "@/services/charityDataService";
import type { CharityProfile } from "@/types/charityProfile";
import { formatNteeCode, getNteeCategory } from "@/utils/nteeMap";
import {
  lookupIrsCode,
  formatRulingYear,
  formatActivityCodes,
} from "@/utils/irsCodeMaps";

/* ------------------------------------------------------------------ */
/* Helper: normalize EIN to hyphenated form                            */
/* ------------------------------------------------------------------ */
function normalizeEin(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return raw;
}

/* ------------------------------------------------------------------ */
/* Skeleton loader                                                     */
/* ------------------------------------------------------------------ */
function ProfileSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      <Skeleton height={224} className="rounded-xl" />
      <Skeleton height={96} className="rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <Skeleton height={160} className="rounded-xl" />
          <Skeleton height={160} className="rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton height={200} className="rounded-xl" />
          <Skeleton height={200} className="rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status pill                                                         */
/* ------------------------------------------------------------------ */
function StatusPill({ profile }: { profile: CharityProfile }) {
  const { t } = useTranslation();
  if (profile.status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <CheckCircle className="h-3.5 w-3.5" />
        {t("charity.profile.verified501c3", "Verified nonprofit")}
      </span>
    );
  }
  if (profile.status === "claimed-pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <Clock className="h-3.5 w-3.5" />
        {t("charity.profile.statusClaimed", "Claimed")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <AlertTriangle className="h-3.5 w-3.5" />
      {t("charity.profile.statusUnclaimed", "Unclaimed \u2014 public registry data only")}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Registry public record (collapsible)                                */
/* ------------------------------------------------------------------ */
function RegistryPublicRecord({
  charityRecord,
}: {
  charityRecord: CharityRecord;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const rows = useMemo(
    () => [
      { label: t("charity.profile.rowEin", "Tax ID"), value: charityRecord.ein },
      {
        label: t("charity.profile.rowName", "Name"),
        value: charityRecord.name,
      },
      {
        label: t("charity.profile.rowLocation", "Location"),
        value:
          [charityRecord.city, charityRecord.state, charityRecord.zip]
            .filter(Boolean)
            .join(", ") || "—",
      },
      {
        label: t("charity.profile.rowRulingYear", "Registration year"),
        value: formatRulingYear(charityRecord.ruling),
      },
      {
        label: t("charity.profile.rowNteeCode", "Sector code"),
        value: formatNteeCode(charityRecord.ntee_cd),
      },
      {
        label: t("charity.profile.rowDeductibility", "Deductibility"),
        value: lookupIrsCode("deductibility", charityRecord.deductibility),
      },
      {
        label: t("charity.profile.rowAffiliation", "Affiliation"),
        value: lookupIrsCode("affiliation", charityRecord.affiliation),
      },
      {
        label: t("charity.profile.rowClassification", "Classification"),
        value: charityRecord.classification ?? "—",
      },
      {
        label: t("charity.profile.rowFoundation", "Foundation type"),
        value: lookupIrsCode("foundation", charityRecord.foundation),
      },
      {
        label: t("charity.profile.rowActivityCodes", "Activity codes"),
        value: formatActivityCodes(charityRecord.activity),
      },
      {
        label: t("charity.profile.rowOrgType", "Organization type"),
        value: charityRecord.organization ?? "—",
      },
      {
        label: t("charity.profile.rowSubsection", "Subsection"),
        value: charityRecord.subsection ?? "—",
      },
      {
        label: t("charity.profile.rowStatus", "Status"),
        value: charityRecord.status ?? "—",
      },
    ],
    [charityRecord, t],
  );

  return (
    <Card hover={false} className="p-5">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-semibold text-gray-900">
          {t("charity.profile.registryRecord", "Registry Public Record")}
        </h3>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && (
        <div className="mt-4 space-y-2">
          <dl className="space-y-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-gray-500 shrink-0">{row.label}</dt>
                <dd className="text-gray-900 font-medium text-right">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
            {t(
              "charity.profile.registrySource",
              "Data sourced from official charity registry.",
            )}
          </p>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Derived display values from profile + charity record                */
/* ------------------------------------------------------------------ */
interface ProfileDisplayData {
  orgName: string;
  location: string;
  rulingYear: string;
  isUnclaimed: boolean;
  isClaimed: boolean;
  isVerified: boolean;
  nteeCategory: string;
  walletAddress: string | null;
  walletDesignationStatus:
    | "unset"
    | "pending_signature_verification"
    | "pending_email_confirmation"
    | "active"
    | null;
  bannerImageUrl: string | null | undefined;
  logoUrl: string | null | undefined;
  photo1Url: string | null | undefined;
  photo2Url: string | null | undefined;
  description: string | null | undefined;
  missionStatement: string | null | undefined;
  contactEmail: string | null | undefined;
  website: string | null;
  claimedByUserId: string | null | undefined;
}

/** Extracts display-ready values from the raw profile and charity record. */
function deriveDisplayData(
  profile: CharityProfile | null,
  charityRecord: CharityRecord | null,
): ProfileDisplayData {
  return {
    orgName: profile?.name ?? charityRecord?.name ?? "Unknown Organization",
    location:
      profile?.location ??
      [charityRecord?.city, charityRecord?.state].filter(Boolean).join(", ") ??
      "",
    rulingYear: formatRulingYear(charityRecord?.ruling),
    isUnclaimed: !profile || profile.status === "unclaimed",
    isClaimed:
      profile?.status === "claimed-pending" || profile?.status === "verified",
    isVerified: profile?.status === "verified",
    nteeCategory: getNteeCategory(charityRecord?.ntee_cd ?? profile?.ntee_code),
    walletAddress: profile?.wallet_address ?? null,
    walletDesignationStatus: profile?.wallet_designation_status ?? null,
    bannerImageUrl: profile?.banner_image_url,
    logoUrl: profile?.logo_url,
    photo1Url: profile?.photo_1_url,
    photo2Url: profile?.photo_2_url,
    description: profile?.description,
    missionStatement: profile?.mission_statement,
    contactEmail: profile?.contact_email,
    website: profile?.website ?? null,
    claimedByUserId: profile?.claimed_by_user_id,
  };
}

/* ------------------------------------------------------------------ */
/* Header card                                                         */
/* ------------------------------------------------------------------ */
/** Org name, metadata lines, and category tags for the header card. */
function HeaderInfo({
  orgName,
  ein,
  location,
  rulingYear,
  nteeCategory,
  profile,
  charityRecord,
}: {
  orgName: string;
  ein: string;
  location: string;
  rulingYear: string;
  nteeCategory: string;
  profile: CharityProfile | null;
  charityRecord: CharityRecord | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-serif text-2xl font-bold text-gray-900">
          {orgName}
        </h1>
        {profile && <StatusPill profile={profile} />}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
        <span>
          {t("charity.profile.einDisplay", "Tax ID")} {ein}
        </span>
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
        )}
        {rulingYear !== "—" && (
          <span>
            {t("charity.profile.registeredYear", "Registered {{year}}", {
              year: rulingYear,
            })}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          {nteeCategory}
        </span>
        {charityRecord?.subsection === "03" && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {t("charity.profile.registeredNonprofit", "Registered nonprofit")}
          </span>
        )}
      </div>
    </div>
  );
}

/** Header card displayed flush below the hero banner with org name, status, and actions. */
function ProfileHeaderCard({
  orgName,
  ein,
  location,
  rulingYear,
  nteeCategory,
  profile,
  charityRecord,
  onShare,
  copied,
  logoUrl,
}: {
  orgName: string;
  ein: string;
  location: string;
  rulingYear: string;
  nteeCategory: string;
  profile: CharityProfile | null;
  charityRecord: CharityRecord | null;
  onShare: () => void;
  copied: boolean;
  logoUrl: string | null | undefined;
}) {
  const { t } = useTranslation();
  const initials = orgName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <Card
      hover={false}
      className="relative rounded-t-none border-t-0 p-5 md:p-6"
    >
      <div className="absolute -top-8 md:-top-10 left-4 md:left-6">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${orgName} logo`}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-white shadow-sm"
          />
        ) : (
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-emerald-600 border-2 border-white shadow-sm flex items-center justify-center">
            <span className="text-white font-serif font-bold text-xl md:text-2xl select-none">
              {initials}
            </span>
          </div>
        )}
      </div>
      <div className="pt-10 md:pt-0 md:pl-28 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <HeaderInfo
          orgName={orgName}
          ein={ein}
          location={location}
          rulingYear={rulingYear}
          nteeCategory={nteeCategory}
          profile={profile}
          charityRecord={charityRecord}
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onShare}
            className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors relative"
            aria-label={t("charity.profile.shareAria", "Share")}
          >
            <Share2 className="h-4 w-4" />
            {copied && (
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs bg-gray-900 text-white px-2 py-0.5 rounded whitespace-nowrap">
                {t("charity.profile.copied", "Copied!")}
              </span>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* About card                                                          */
/* ------------------------------------------------------------------ */
/** About card showing description, mission, or IRS activity codes as fallback. */
function AboutCard({
  description,
  missionStatement,
  mission,
  activity,
  website,
  einDigits,
}: {
  description: string | null | undefined;
  missionStatement: string | null | undefined;
  mission: string | undefined;
  activity: string | null | undefined;
  website: string | null;
  einDigits: string;
}) {
  const { t } = useTranslation();
  return (
    <Card hover={false} className="p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">
        {t("charity.profile.about", "About")}
      </h3>
      {description || missionStatement || mission ? (
        <p className="text-sm text-gray-600 leading-relaxed">
          {description ?? missionStatement ?? mission}
        </p>
      ) : (
        <div className="text-sm text-gray-600">
          {activity && activity !== "000000000" ? (
            <>
              <p>
                {t(
                  "charity.profile.activityIntro",
                  "This organization's activities include: activity codes",
                )}{" "}
                {formatActivityCodes(activity)}.
              </p>
              <p className="italic text-gray-400 mt-2">
                {t(
                  "charity.profile.notCustomized",
                  "This description has not been customized yet.",
                )}{" "}
                <a
                  href={`/claim/${einDigits}`}
                  className="text-emerald-600 hover:underline not-italic"
                >
                  {t("charity.profile.claimProfile", "Claim this profile")}
                </a>
              </p>
            </>
          ) : (
            <p className="italic text-gray-400">
              {t("charity.profile.noDescription", "No description available.")}{" "}
              <a
                href={`/claim/${einDigits}`}
                className="text-emerald-600 hover:underline not-italic"
              >
                {t("charity.profile.claimProfile", "Claim this profile")}
              </a>{" "}
              {t("charity.profile.toAddOne", "to add one.")}
            </p>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-emerald-600 hover:underline text-sm"
            >
              <Globe className="h-3.5 w-3.5" />
              {website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Contact card                                                        */
/* ------------------------------------------------------------------ */
/** Contact card shown for claimed profiles with email or website links. */
function ContactCard({
  website,
  contactEmail,
}: {
  website: string | null;
  contactEmail: string | null | undefined;
}) {
  const { t } = useTranslation();
  return (
    <Card hover={false} className="p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {t("charity.profile.contact", "Contact")}
      </h3>
      <div className="space-y-2 text-sm">
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-emerald-600 hover:underline"
          >
            <Globe className="h-4 w-4" />
            {website.replace(/^https?:\/\//, "")}
          </a>
        )}
        {contactEmail && (
          <a
            href={`mailto:${contactEmail}`}
            className="flex items-center gap-2 text-emerald-600 hover:underline"
          >
            <Mail className="h-4 w-4" />
            {contactEmail}
          </a>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

/**
 * Full charity profile page with hero banner, header card, two-column layout,
 * and donate widget. Fetches data from both charity records and charity_profiles.
 * @returns The rendered charity profile page
 */
function CharityProfilePage() {
  const { ein: rawEin } = useParams<{ ein: string }>();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<CharityProfile | null>(null);
  const [charityRecord, setCharityRecord] = useState<CharityRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const ein = rawEin ? normalizeEin(rawEin) : "";
  const einDigits = rawEin?.replace(/\D/g, "") ?? "";

  // Fetch both profile and IRS record in parallel
  const fetchData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setProfile(null);
    setCharityRecord(null);

    if (!rawEin) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const [profileResult, irsResult] = await Promise.all([
      getCharityProfileByEin(rawEin ?? ""),
      getCharityRecordByEin(rawEin ?? ""),
    ]);

    if (irsResult) {
      setCharityRecord(irsResult);
    }

    if (profileResult) {
      setProfile(profileResult);
    } else if (!irsResult) {
      setNotFound(true);
    }

    setLoading(false);
  }, [rawEin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set page title
  useEffect(() => {
    const name = profile?.name ?? charityRecord?.name;
    if (name) {
      document.title = `${name} | Give Protocol`;
    }
    return () => {
      document.title = "Give Protocol";
    };
  }, [profile?.name, charityRecord?.name]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handlePhotoUploaded = useCallback(
    (_slot: 1 | 2, _url: string) => {
      fetchData();
    },
    [fetchData],
  );

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (notFound && !charityRecord && !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card hover={false} className="p-8 text-center">
          <Building2
            aria-hidden="true"
            className="h-10 w-10 text-gray-300 mx-auto mb-4"
          />
          <p className="text-gray-600">
            {t(
              "charity.profile.charityNotFoundByTaxId",
              "We couldn't find a charity with this tax ID.",
            )}
          </p>
        </Card>
      </div>
    );
  }

  const display = deriveDisplayData(profile, charityRecord);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      {display.isUnclaimed && <UnclaimedProfileBanner ein={einDigits} />}

      <div>
        <CharityHeroBanner
          bannerImageUrl={display.bannerImageUrl}
          orgName={display.orgName}
        />
        <ProfileHeaderCard
          orgName={display.orgName}
          ein={ein}
          location={display.location}
          rulingYear={display.rulingYear}
          nteeCategory={display.nteeCategory}
          profile={profile}
          charityRecord={charityRecord}
          onShare={handleShare}
          copied={copied}
          logoUrl={display.logoUrl}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <AboutCard
            description={display.description}
            missionStatement={display.missionStatement}
            mission={profile?.mission}
            activity={charityRecord?.activity}
            website={display.website}
            einDigits={einDigits}
          />

          <PhotosCard
            ein={einDigits}
            photo1Url={display.photo1Url}
            photo2Url={display.photo2Url}
            claimedByUserId={display.claimedByUserId}
            onPhotoUploaded={handlePhotoUploaded}
          />

          {charityRecord && (
            <RegistryPublicRecord charityRecord={charityRecord} />
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {display.isUnclaimed ? (
            <RequestCharityWidget
              ein={einDigits}
              charityName={display.orgName}
            />
          ) : (
            <DonateWidget
              ein={einDigits}
              charityName={display.orgName}
              walletAddress={display.walletAddress}
              walletDesignationStatus={display.walletDesignationStatus}
              charityId={profile?.id ?? einDigits}
              mode="sidebar"
              isVerified={display.isVerified}
            />
          )}

          {charityRecord && <OrgDetailsCard charityRecord={charityRecord} />}

          {display.isClaimed && (display.contactEmail || display.website) && (
            <ContactCard
              website={display.website}
              contactEmail={display.contactEmail}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CharityProfilePage;
