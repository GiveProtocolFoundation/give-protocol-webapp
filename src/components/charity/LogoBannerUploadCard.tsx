import React, { useCallback, useRef } from "react";
import { Camera, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { Logger } from "@/utils/logger";

/** Props for the logo and banner image upload card on the charity profile page. */
export interface LogoBannerUploadCardProps {
  ein: string;
  logoUrl: string | null | undefined;
  bannerImageUrl: string | null | undefined;
  claimedByUserId: string | null | undefined;
  /** When true, skip the ownership check — the portal already gates access. */
  portalContext?: boolean;
  onLogoUploaded: (_url: string | null) => void;
  onBannerUploaded: (_url: string | null) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Returns the first two characters of an EIN (dashes removed) as uppercase initials.
 * @param ein - The charity EIN number
 * @returns Two uppercase characters for use as a logo placeholder
 */
function getInitials(ein: string): string {
  return ein.replace(/-/g, "").slice(0, 2).toUpperCase();
}

/**
 * Logo and banner upload card for the charity profile.
 * Only visible to the profile owner (claimed_by = auth.uid()).
 * @param props - Component props
 * @returns The rendered logo/banner upload card, or null when user is not the owner
 */
export const LogoBannerUploadCard: React.FC<LogoBannerUploadCardProps> = ({
  ein,
  logoUrl,
  bannerImageUrl,
  claimedByUserId,
  portalContext = false,
  onLogoUploaded,
  onBannerUploaded,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // In portal context the charity portal already gates access, so skip ownership check
  const isOwner =
    portalContext ||
    Boolean(user?.id && claimedByUserId && user.id === claimedByUserId);

  const uploadFile = useCallback(
    async (file: File, kind: "logo" | "banner"): Promise<void> => {
      if (!ALLOWED_TYPES.has(file.type)) {
        showToast(
          "error",
          "Invalid file type",
          "Please upload a JPEG, PNG, or WebP image.",
        );
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        showToast("error", "File too large", "Maximum file size is 5 MB.");
        return;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${ein}/${kind}.${ext}`;

      const { error } = await supabase.storage
        .from("charity-assets")
        .upload(path, file, { cacheControl: "3600", upsert: true });

      if (error) {
        Logger.error("Logo/banner upload failed", { error, ein, kind, path });
        showToast(
          "error",
          "Upload failed",
          error.message || "Please try again.",
        );
        return;
      }

      const { data: urlData } = supabase.storage
        .from("charity-assets")
        .getPublicUrl(path);
      const column = kind === "logo" ? "logo_url" : "banner_image_url";

      const { error: rpcError } = await supabase.rpc(
        "update_charity_asset_url",
        { p_ein: ein, p_column: column, p_url: urlData.publicUrl },
      );

      if (rpcError) {
        Logger.error("Failed to save asset URL", {
          error: rpcError,
          ein,
          column,
        });
        showToast("error", "Upload saved but URL not linked", rpcError.message);
        return;
      }

      if (kind === "logo") {
        onLogoUploaded(urlData.publicUrl);
      } else {
        onBannerUploaded(urlData.publicUrl);
      }
      showToast("success", `${kind === "logo" ? "Logo" : "Banner"} uploaded`);
    },
    [ein, showToast, onLogoUploaded, onBannerUploaded],
  );

  const handleLogoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFile(file, "logo");
      }
    },
    [uploadFile],
  );

  const handleBannerFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFile(file, "banner");
      }
    },
    [uploadFile],
  );

  const handleLogoClick = useCallback(() => {
    logoInputRef.current?.click();
  }, []);

  const handleBannerClick = useCallback(() => {
    bannerInputRef.current?.click();
  }, []);

  const handleRemoveLogo = useCallback(async () => {
    await supabase.rpc("update_charity_asset_url", {
      p_ein: ein,
      p_column: "logo_url",
      p_url: null,
    });
    onLogoUploaded(null);
    showToast("success", "Logo removed");
  }, [ein, onLogoUploaded, showToast]);

  const handleRemoveBanner = useCallback(async () => {
    await supabase.rpc("update_charity_asset_url", {
      p_ein: ein,
      p_column: "banner_image_url",
      p_url: null,
    });
    onBannerUploaded(null);
    showToast("success", "Banner removed");
  }, [ein, onBannerUploaded, showToast]);

  if (!isOwner) return null;

  const initials = getInitials(ein);

  return (
    <Card hover={false} className="p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Logo &amp; Banner
      </h3>

      {/* Banner zone */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Banner</p>
        <div className="relative w-full h-40 rounded-lg overflow-hidden">
          {bannerImageUrl ? (
            <>
              <img
                src={bannerImageUrl}
                alt="Organization banner"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveBanner}
                aria-label="Remove banner"
                className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleBannerClick}
              className="w-full h-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex flex-col items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Camera className="h-6 w-6 text-white/70" />
              <span className="text-xs text-white/70">Upload banner</span>
            </button>
          )}
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleBannerFileChange}
        />
      </div>

      {/* Logo zone */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Logo</p>
        <div className="flex items-center gap-4">
          <div className="relative w-32 h-32 flex-shrink-0">
            {logoUrl ? (
              <>
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="w-32 h-32 rounded-full object-cover border-2 border-white shadow-md"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  aria-label="Remove logo"
                  className="absolute top-0 right-0 bg-white/80 rounded-full p-1 hover:bg-white transition-colors"
                >
                  <X className="h-3 w-3 text-gray-600" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogoClick}
                className="w-32 h-32 rounded-full bg-emerald-600 flex flex-col items-center justify-center gap-1 hover:bg-emerald-700 transition-colors cursor-pointer group"
              >
                <span className="text-2xl font-bold text-white group-hover:hidden">
                  {initials}
                </span>
                <Camera className="h-6 w-6 text-white hidden group-hover:block" />
                <span className="text-xs text-white/80 hidden group-hover:block">
                  Upload logo
                </span>
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">
            JPEG, PNG or WebP · max 5 MB · displayed as a circle
          </p>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleLogoFileChange}
        />
      </div>
    </Card>
  );
};
