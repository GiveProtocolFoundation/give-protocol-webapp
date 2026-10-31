import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface SignaturePadProps {
  /** Called when signature data changes; receives a data-URI PNG or empty string */
  onSignatureChange: (_dataUri: string) => void;
  /** Pad width in pixels */
  width?: number;
  /** Pad height in pixels */
  height?: number;
  /** Whether the pad is disabled */
  disabled?: boolean;
}

/**
 * Canvas-based drawn-signature capture pad.
 * Exports the drawing as a PNG data-URI via the onSignatureChange callback.
 *
 * @param props - SignaturePadProps
 * @returns The signature pad element
 */
export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  width = 480,
  height = 160,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  /** Returns the 2D rendering context or null. */
  const getCtx = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  /** Translates a mouse/touch event into canvas-relative (x, y). */
  const getPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  /** Exports the current canvas content as a PNG data-URI. */
  const emitSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUri = canvas.toDataURL("image/png");
    onSignatureChange(dataUri);
  }, [onSignatureChange]);

  /** Starts a new stroke at the event position. */
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      isDrawingRef.current = true;
      const ctx = getCtx();
      if (!ctx) return;
      const pt = getPoint(e);
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    },
    [disabled, getCtx, getPoint],
  );

  /** Continues the current stroke as the pointer moves. */
  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current || disabled) return;
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const pt = getPoint(e);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    },
    [disabled, getCtx, getPoint],
  );

  /** Ends the current stroke and exports. */
  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setHasStrokes(true);
    emitSignature();
  }, [emitSignature]);

  /** Clears the canvas and resets the signature. */
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onSignatureChange("");
  }, [getCtx, onSignatureChange]);

  // Initialise canvas drawing style on mount
  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [getCtx]);

  // End stroke if pointer leaves the window (prevents ghost strokes)
  useEffect(() => {
    const end = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        if (hasStrokes) {
          emitSignature();
        }
      }
    };
    window.addEventListener("mouseup", end);
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchend", end);
    };
  }, [hasStrokes, emitSignature]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          style={{ aspectRatio: `${width} / ${height}` }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          aria-label={t(
            "cfia.signaturePad.ariaLabel",
            "Signature drawing area",
          )}
          role="img"
        />
        {/* Baseline hint */}
        {!hasStrokes && (
          <p
            className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 pointer-events-none select-none"
            aria-hidden="true"
          >
            {t("cfia.signaturePad.placeholder", "Sign here")}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleClear}
        disabled={disabled || !hasStrokes}
        className="self-end inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label={t("cfia.signaturePad.clear", "Clear signature")}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        {t("cfia.signaturePad.clearButton", "Clear")}
      </button>
    </div>
  );
};
