import React, { useCallback, useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/components/Wallet/utils";
import { useToast } from "@/hooks/useToast";
import { SOCIAL_PLATFORMS } from "./platforms";
import type { SocialPlatform } from "./platforms";

interface PostDonationShareProps {
  /** Name of the charity that received the donation */
  charityName: string;
  /** URL to the charity's page for sharing. Falls back to window.location.href. */
  charityUrl?: string;
}

/**
 * Single social share icon button styled for card context.
 * @param props - Platform descriptor and click handler
 * @returns Rendered share button
 */
function ShareButton({
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
      className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

/**
 * Copy link button that shows "Copy Link" or "Copied!" text.
 * @param props - Copied state flag and click handler
 * @returns Rendered copy button
 */
function CopyButton({
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
      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
      <span>{copied ? "Copied!" : "Copy Link"}</span>
    </button>
  );
}

/**
 * Post-donation share card rendered inside the DonationModal success screen.
 * Provides social sharing buttons, a copy-link action, and an editable share message.
 *
 * @param props - Component props
 * @returns Rendered share card
 */
export const PostDonationShare: React.FC<PostDonationShareProps> = ({
  charityName,
  charityUrl,
}) => {
  const [message, setMessage] = useState(
    `I just supported ${charityName} on Give Protocol. Join me in making a difference!`,
  );
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const getUrl = useCallback(
    () => charityUrl ?? window.location.href,
    [charityUrl],
  );

  const handleShare = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const platformId = event.currentTarget.dataset.platform;
      const platform = SOCIAL_PLATFORMS.find((p) => p.id === platformId);
      if (!platform) return;

      const shareUrl = platform.getShareUrl(getUrl(), message);
      window.open(
        shareUrl,
        "_blank",
        "noopener,noreferrer,width=600,height=500",
      );
    },
    [getUrl, message],
  );

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(getUrl());
    if (success) {
      showToast("success", "Link Copied");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [getUrl, showToast]);

  const handleMessageChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(event.target.value);
    },
    [],
  );

  return (
    <section
      aria-label="Share your donation"
      className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 mt-4"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Your impact is real.
      </h3>

      <div className="flex flex-wrap gap-2 items-center">
        {SOCIAL_PLATFORMS.map((platform) => (
          <ShareButton
            key={platform.id}
            platform={platform}
            onClick={handleShare}
          />
        ))}
        <div className="border-l border-gray-200 dark:border-slate-600 h-6 mx-1" />
        <CopyButton copied={copied} onClick={handleCopy} />
      </div>

      <div className="mt-4">
        <label
          htmlFor="share-message"
          className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1"
        >
          Pre-written message
        </label>
        <textarea
          id="share-message"
          value={message}
          onChange={handleMessageChange}
          rows={3}
          className="w-full p-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    </section>
  );
};

export default PostDonationShare;
