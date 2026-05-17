import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/utils/cn';

interface TranslatedTextProps {
  i18nKey: string;
  values?: Record<string, string | number>;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Renders a translated string for the given i18n key inside the requested element type.
 * @param props - Component props.
 * @param props.i18nKey - The translation key to resolve.
 * @param props.values - Optional interpolation values passed to the translator.
 * @param props.className - Optional class names applied to the rendered element.
 * @param props.as - HTML element type to render (defaults to `span`).
 * @returns The translated text wrapped in the requested element.
 */
export const TranslatedText: React.FC<TranslatedTextProps> = ({
  i18nKey,
  values,
  className,
  as: Component = 'span'
}) => {
  const { t } = useTranslation();
  
  return (
    <Component className={cn(className)}>
      {t(i18nKey, values)}
    </Component>
  );
};