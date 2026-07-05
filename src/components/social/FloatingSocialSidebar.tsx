import React, { useCallback, useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/components/Wallet/utils";
import { useToast } from "@/hooks/useToast";
import { SOCIAL_PLATFORMS } from "./platforms";
import type { SocialPlatform } from "./platforms";

/**
 * Single social share icon button.
 * @param props - Platform descriptor and click handler
 * @returns Rendered icon button
 */
function SocialButton({
  platform,
  onClick,
}: {
  platform: SocialPlatform;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}): React.ReactElement {
  const Icon = platform.icon;
  return (
    <button
      type="button"
      data-platform={platform.id}
      onClick={onClick}
      aria-label={platform.label}
      className="p-2 text-gray-400 hover:text-emerald-400 hover:scale-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

/**
 * Copy link button with check icon feedback.
 * @param props - Copied state flag and click handler
 * @returns Rendered copy button
 */
function CopyLinkButton({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Link copied" : "Copy link"}
      className="p-2 text-gray-400 hover:text-emerald-400 hover:scale-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
    >
      {copied ? (
        <Check className="w-5 h-5 text-emerald-400" />
      ) : (
        <Copy className="w-5 h-5" />
      )}
    </button>
  );
}

interface FloatingSocialSidebarProps {
  /** Page title for share messages. Falls back to document.title. */
  title?: string;
  /** Custom share URL. Falls back to window.location.href. */
  url?: string;
}

/**
 * Floating social sharing sidebar with desktop and mobile layouts.
 * Desktop: fixed vertical pill on the left side.
 * Mobile: fixed horizontal bar at the bottom.
 *
 * @param props - Component props
 * @returns Rendered social sidebar
 */
export const FloatingSocialSidebar: React.FC<FloatingSocialSidebarProps> = ({
  title,
  url,
}) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const getShareUrl = useCallback(() => url ?? window.location.href, [url]);
  const getShareMessage = useCallback(() => title ?? document.title, [title]);

  const handleShare = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const platformId = event.currentTarget.dataset.platform;
      const platform = SOCIAL_PLATFORMS.find((p) => p.id === platformId);
      if (!platform) return;

      const shareUrl = platform.getShareUrl(getShareUrl(), getShareMessage());
      window.open(
        shareUrl,
        "_blank",
        "noopener,noreferrer,width=600,height=500",
      );
    },
    [getShareUrl, getShareMessage],
  );

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(getShareUrl());
    if (success) {
      showToast("success", "Link Copied");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [getShareUrl, showToast]);

  return (
    <>
      {/* Desktop — vertical pill on left */}
      <aside
        aria-label="Share this page"
        className="hidden md:flex md:flex-col fixed left-4 top-[60%] -translate-y-1/2 z-40 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-full shadow-lg p-2 gap-1"
      >
        {SOCIAL_PLATFORMS.map((platform) => (
          <SocialButton
            key={platform.id}
            platform={platform}
            onClick={handleShare}
          />
        ))}
        <div className="border-t border-white/10 my-1" />
        <CopyLinkButton copied={copied} onClick={handleCopy} />
      </aside>

      {/* Mobile — bottom bar */}
      <aside
        aria-label="Share this page"
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-white/10 shadow-lg justify-center items-center gap-1 px-2 py-1"
      >
        {SOCIAL_PLATFORMS.map((platform) => (
          <SocialButton
            key={platform.id}
            platform={platform}
            onClick={handleShare}
          />
        ))}
        <div className="border-l border-white/10 h-6 mx-1" />
        <CopyLinkButton copied={copied} onClick={handleCopy} />
      </aside>
    </>
  );
};

export default FloatingSocialSidebar;
