import React, { useCallback, useRef } from "react";
import { Camera } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { Logger } from "@/utils/logger";

interface PhotosCardProps {
  ein: string;
  photo1Url: string | null | undefined;
  photo2Url: string | null | undefined;
  claimedByUserId: string | null | undefined;
  onPhotoUploaded: (_slot: 1 | 2, _url: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Two-slot photo gallery card for the charity profile.
 * Shows photos or placeholder slots. Claimed owners can upload images.
 * @param props - Component props
 * @returns The rendered photos card
 */
export const PhotosCard: React.FC<PhotosCardProps> = ({
  ein,
  photo1Url,
  photo2Url,
  claimedByUserId,
  onPhotoUploaded,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const isOwner = Boolean(
    user?.id && claimedByUserId && user.id === claimedByUserId,
  );

  const handleUpload = useCallback(
    async (file: File, slot: 1 | 2) => {
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
      const path = `${ein}/photo${slot}.${ext}`;

      const { error } = await supabase.storage
        .from("charity-assets")
        .upload(path, file, { cacheControl: "3600", upsert: true });

      if (error) {
        Logger.error("Photo upload failed", { error, ein, slot });
        showToast("error", "Upload failed", "Please try again.");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("charity-assets")
        .getPublicUrl(path);

      const photoColumn = slot === 1 ? "photo_1_url" : "photo_2_url";
      await supabase
        .from("charity_profiles")
        .update({ [photoColumn]: urlData.publicUrl })
        .eq("ein", ein);

      onPhotoUploaded(slot, urlData.publicUrl);
      showToast("success", "Photo uploaded");
    },
    [ein, showToast, onPhotoUploaded],
  );

  const handleFileChange = useCallback(
    (slot: 1 | 2) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file, slot);
      }
    },
    [handleUpload],
  );

  const handleSlotClick = useCallback(
    (slot: 1 | 2) => () => {
      if (!isOwner) return;
      const ref = slot === 1 ? fileInput1Ref : fileInput2Ref;
      ref.current?.click();
    },
    [isOwner],
  );

  const photos = [
    { slot: 1 as const, url: photo1Url, ref: fileInput1Ref },
    { slot: 2 as const, url: photo2Url, ref: fileInput2Ref },
  ];

  const hasPhotos = Boolean(photo1Url) || Boolean(photo2Url);

  return (
    <Card hover={false} className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Photos</h3>
        <span className="text-xs text-gray-400">
          {hasPhotos ? "Uploaded by organization" : "No photos uploaded yet"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {photos.map(({ slot, url, ref }) => (
          <div key={slot}>
            {url ? (
              <img
                src={url}
                alt={`Organization ${slot}`}
                className="rounded-lg object-cover h-36 w-full"
              />
            ) : (
              <button
                type="button"
                onClick={handleSlotClick(slot)}
                disabled={!isOwner}
                className={`w-full h-36 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors ${
                  isOwner
                    ? "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer"
                    : "border-gray-200 cursor-default"
                }`}
              >
                <Camera className="h-5 w-5 text-gray-400" />
                <span className="text-xs text-gray-400">
                  {isOwner ? "Upload photo" : `Photo ${slot}`}
                </span>
              </button>
            )}
            {isOwner && (
              <input
                ref={ref}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange(slot)}
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
