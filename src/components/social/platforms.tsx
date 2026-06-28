import React from "react";
import {
  FaFacebook,
  FaXTwitter,
  FaLinkedin,
  FaWhatsapp,
  FaTelegram,
} from "react-icons/fa6";

/** Farcaster logo as inline SVG (not available in react-icons). */
export function FarcasterIcon({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5.13 3h13.74v1.2l-1.5 1.5H6.63l-1.5-1.5V3Zm-1.5 3.6h16.74v13.8h-2.4v-9.6H6.03v9.6H3.63V6.6Zm5.4 4.2h5.94v2.4h-1.77v7.2H10.8v-7.2H9.03V10.8Z" />
    </svg>
  );
}

/** Definition of a social sharing platform with its label, icon, and share-URL builder. */
export interface SocialPlatform {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getShareUrl: (_url: string, _message: string) => string;
}

/**
 * Catalog of supported social sharing platforms with their labels, icons, and share-URL builders.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "facebook",
    label: "Share on Facebook",
    icon: FaFacebook,
    getShareUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "twitter",
    label: "Share on X",
    icon: FaXTwitter,
    getShareUrl: (url, msg) =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "linkedin",
    label: "Share on LinkedIn",
    icon: FaLinkedin,
    getShareUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "whatsapp",
    label: "Share on WhatsApp",
    icon: FaWhatsapp,
    getShareUrl: (url, msg) => {
      const text = encodeURIComponent(`${msg} ${url}`);
      return `https://api.whatsapp.com/send?text=${text}`;
    },
  },
  {
    id: "telegram",
    label: "Share on Telegram",
    icon: FaTelegram,
    getShareUrl: (url, msg) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`,
  },
  {
    id: "farcaster",
    label: "Share on Farcaster",
    icon: FarcasterIcon,
    getShareUrl: (url, msg) =>
      `https://warpcast.com/~/compose?text=${encodeURIComponent(msg)}&embeds[]=${encodeURIComponent(url)}`,
  },
];
