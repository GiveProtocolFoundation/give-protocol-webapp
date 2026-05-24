import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

/**
 * Image upload configuration constants
 * Following industry standards for web image uploads
 */
export const IMAGE_UPLOAD_CONFIG = {
  /** Maximum file size in bytes (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  /** Maximum file size in human-readable format */
  MAX_FILE_SIZE_DISPLAY: "5MB",
  /** Allowed MIME types for upload */
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,
  /** Allowed file extensions for display */
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"],
  /** Recommended dimensions for header images */
  RECOMMENDED_DIMENSIONS: {
    width: 1200,
    height: 630,
  },
  /** Supabase storage bucket name */
  BUCKET_NAME: "opportunity-images",
};

/** MIME type of an image file accepted by the upload handler. */
export type AllowedImageType =
  (typeof IMAGE_UPLOAD_CONFIG.ALLOWED_TYPES)[number];

/** Result of a successful image upload containing the public URL and storage path. */
export interface ImageUploadResult {
  url: string;
  path: string;
}

/** Structured error returned when image upload validation or upload fails. */
export interface ImageUploadError {
  code: "FILE_TOO_LARGE" | "INVALID_TYPE" | "UPLOAD_FAILED" | "BUCKET_ERROR";
  message: string;
}

/** Return value of the useImageUpload hook. */
export interface UseImageUploadReturn {
  uploading: boolean;
  progress: number;
  error: ImageUploadError | null;
  uploadImage: (
    _file: File,
    _folder: string,
  ) => Promise<ImageUploadResult | null>;
  deleteImage: (_path: string) => Promise<boolean>;
  validateFile: (_file: File) => ImageUploadError | null;
  clearError: () => void;
}

/**
 * Validates an image file against upload requirements
 * @param file - The file to validate
 * @returns Error object if validation fails, null if valid
 */
export function validateImageFile(file: File): ImageUploadError | null {
  // Check file size
  if (file.size > IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
    return {
      code: "FILE_TOO_LARGE",
      message: `File size must be less than ${IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE_DISPLAY}. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
    };
  }

  // Check file type
  if (
    !IMAGE_UPLOAD_CONFIG.ALLOWED_TYPES.includes(file.type as AllowedImageType)
  ) {
    return {
      code: "INVALID_TYPE",
      message: `Invalid file type. Allowed types: ${IMAGE_UPLOAD_CONFIG.ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  return null;
}

/**
 * Generates a cryptographically secure random string
 * @param length - Length of the random string
 * @returns Random alphanumeric string
 */
function generateSecureRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .substring(0, length);
}

/**
 * Generates a unique filename for upload
 * @param originalName - Original filename
 * @param folder - Folder path for organization
 * @returns Unique file path
 */
function generateFilePath(originalName: string, folder: string): string {
  const timestamp = Date.now();
  const randomString = generateSecureRandomString(8);
  const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const sanitizedFolder = folder.replaceAll(/[^a-zA-Z0-9-_/]/g, "");
  return `${sanitizedFolder}/${timestamp}-${randomString}.${extension}`;
}

/**
 * Hook for uploading images to Supabase Storage
 * Handles validation, upload progress, and error states
 *
 * @example
 * ```tsx
 * const { uploading, error, uploadImage } = useImageUpload();
 *
 * const handleFileSelect = async (file: File) => {
 *   const result = await uploadImage(file, 'opportunities/charity-123');
 *   if (result) {
 *     console.log('Uploaded to:', result.url);
 *   }
 * };
 * ```
 */
export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ImageUploadError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateFile = useCallback((file: File): ImageUploadError | null => {
    return validateImageFile(file);
  }, []);

  const uploadImage = useCallback(
    async (file: File, folder: string): Promise<ImageUploadResult | null> => {
      setError(null);
      setProgress(0);

      // Validate file first
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        return null;
      }

      setUploading(true);

      try {
        const filePath = generateFilePath(file.name, folder);

        Logger.info("Starting image upload", {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          path: filePath,
        });

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from(IMAGE_UPLOAD_CONFIG.BUCKET_NAME)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          Logger.error("Image upload failed", { error: uploadError });

          // Check if it's a bucket not found error
          if (
            uploadError.message.includes("bucket") ||
            uploadError.message.includes("not found")
          ) {
            setError({
              code: "BUCKET_ERROR",
              message:
                "Image storage is not configured. Please contact support.",
            });
          } else {
            setError({
              code: "UPLOAD_FAILED",
              message: uploadError.message || "Failed to upload image",
            });
          }
          return null;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage
          .from(IMAGE_UPLOAD_CONFIG.BUCKET_NAME)
          .getPublicUrl(data.path);

        setProgress(100);

        Logger.info("Image upload successful", {
          path: data.path,
          url: publicUrl,
        });

        return {
          url: publicUrl,
          path: data.path,
        };
      } catch (err) {
        Logger.error("Image upload exception", { error: err });
        setError({
          code: "UPLOAD_FAILED",
          message:
            err instanceof Error ? err.message : "An unexpected error occurred",
        });
        return null;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const deleteImage = useCallback(async (path: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.storage
        .from(IMAGE_UPLOAD_CONFIG.BUCKET_NAME)
        .remove([path]);

      if (deleteError) {
        Logger.error("Image delete failed", { error: deleteError, path });
        return false;
      }

      Logger.info("Image deleted successfully", { path });
      return true;
    } catch (err) {
      Logger.error("Image delete exception", { error: err, path });
      return false;
    }
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadImage,
    deleteImage,
    validateFile,
    clearError,
  };
}

export default useImageUpload;
