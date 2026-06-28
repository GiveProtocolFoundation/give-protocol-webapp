import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  CharityPageTemplate,
  CharityProfileData,
} from "@/components/charity/CharityPageTemplate";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

interface CharityRow {
  id: string;
  ein: string;
  name: string;
  mission: string | null;
  location: string | null;
  logo_url: string | null;
  ntee_code: string | null;
  status: string;
  wallet_address: string | null;
}

const NTEE_CATEGORY_MAP: Record<string, string> = {
  A: "Arts & Culture",
  B: "Education",
  C: "Environment",
  D: "Animal Welfare",
  E: "Health",
  F: "Mental Health",
  G: "Medical Research",
  H: "Biomedical Research",
  I: "Crime & Legal",
  J: "Employment",
  K: "Food & Nutrition",
  L: "Housing",
  M: "Public Safety",
  N: "Recreation",
  O: "Youth Development",
  P: "Human Services",
  Q: "International",
  R: "Civil Rights",
  S: "Community Development",
  T: "Philanthropy",
  U: "Science & Technology",
  V: "Social Science",
  W: "Public Policy",
  X: "Religion",
  Y: "Mutual Benefit",
};

/**
 * Maps an NTEE code prefix to a human-readable category name.
 * @param nteeCode - NTEE code string (e.g. "B20")
 * @returns Category label or "Nonprofit" as fallback
 */
function nteeToCategory(nteeCode: string | null | undefined): string {
  if (!nteeCode) return "Nonprofit";
  const major = nteeCode.charAt(0).toUpperCase();
  return NTEE_CATEGORY_MAP[major] ?? "Nonprofit";
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1536825704610-e570ddf0f4b1?auto=format&fit=crop&w=800";

/**
 * Dynamic charity detail page — loads real charity data from Supabase
 * by EIN (the `:id` URL parameter).
 */
const CharityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [charityData, setCharityData] = useState<CharityProfileData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    supabase
      .from("charity_profiles")
      .select(
        "id, ein, name, mission, location, logo_url, ntee_code, status, wallet_address",
      )
      .eq("ein", id)
      .single()
      .then(({ data, error }) => {
        if (!mountedRef.current) return;
        if (error || !data) {
          Logger.error("CharityDetail: profile not found", { error, ein: id });
          setNotFound(true);
          setLoading(false);
          return;
        }
        const row = data as CharityRow;
        setCharityData({
          id: row.id,
          walletAddress: row.wallet_address ?? "",
          name: row.name,
          description: row.mission ?? "",
          category: nteeToCategory(row.ntee_code),
          image: row.logo_url ?? FALLBACK_IMAGE,
          verified: row.status === "verified",
          country: row.location ?? "United States",
          stats: { totalDonated: 0, donorCount: 0, projectsCompleted: 0 },
          mission: row.mission ?? "",
          impact: [],
        });
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (notFound || !charityData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Charity not found</h1>
        <p className="text-gray-600">
          The charity you are looking for does not exist or has not been
          verified.
        </p>
      </div>
    );
  }

  return <CharityPageTemplate charity={charityData} />;
};

export default CharityDetail;
