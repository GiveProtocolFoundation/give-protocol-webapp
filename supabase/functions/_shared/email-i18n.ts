/**
 * Shared email i18n strings for all transactional email edge functions.
 * @module email-i18n
 * @description GIV-639: Translations for 7 email templates (Templates 1–7 from
 *   GIV-634 plan) across 12 locales. Template 8 (password reset) is a static
 *   Supabase Auth template that cannot be per-locale without dashboard access.
 *
 * IMPORTANT — US-receipt legal compliance:
 *   The 501(c)(3)/IRS legal paragraph in donation receipts (Templates 3 & 4)
 *   MUST remain verbatim English for US charities (IRS Pub. 1771). All other
 *   body copy (table field labels, non-US tax note, opening/closing) is translated.
 *
 * Usage in edge functions:
 *   import { resolveLocale, getEmailStrings, fill } from "../_shared/email-i18n.ts";
 *   const locale = resolveLocale(req.locale);
 *   const t = getEmailStrings(locale);
 *   const subject = fill(t.charityApproval.subject, {});
 */

export type EmailLocale =
  | "en"
  | "es"
  | "de"
  | "fr"
  | "ja"
  | "zh-CN"
  | "zh-TW"
  | "th"
  | "vi"
  | "ko"
  | "ar"
  | "hi";

/** BCP 47 tags for Intl formatting */
const INTL_TAG: Record<EmailLocale, string> = {
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  th: "th-TH",
  vi: "vi-VN",
  ko: "ko-KR",
  ar: "ar-SA",
  hi: "hi-IN",
};

const RTL_LOCALES = new Set<EmailLocale>(["ar"]);

/** Normalize a raw locale string to a supported EmailLocale, defaulting to "en" */
export function resolveLocale(raw: string | null | undefined): EmailLocale {
  if (!raw) return "en";
  const trimmed = raw.trim();
  const valid: EmailLocale[] = [
    "en", "es", "de", "fr", "ja", "zh-CN", "zh-TW", "th", "vi", "ko", "ar", "hi",
  ];
  if ((valid as string[]).includes(trimmed)) return trimmed as EmailLocale;
  const prefix = trimmed.split("-")[0].toLowerCase();
  return valid.find((l) => l.toLowerCase() === prefix) ?? "en";
}

/** Replace {{key}} placeholders in a template string */
export function fill(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(vars[key] ?? `{{${key}}}`),
  );
}

/** Format a currency amount locale-appropriately */
export function formatAmountLocale(
  cents: number,
  currency: string,
  locale: EmailLocale,
  zeroDecimalCurrencies: string[],
): string {
  const major = zeroDecimalCurrencies.includes(currency.toUpperCase())
    ? cents
    : cents / 100;
  try {
    return new Intl.NumberFormat(INTL_TAG[locale], {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(2)}`;
  }
}

/** Format an ISO date string locale-appropriately */
export function formatDateLocale(isoDate: string, locale: EmailLocale): string {
  try {
    return new Date(isoDate).toLocaleDateString(INTL_TAG[locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

// ---------------------------------------------------------------------------
// String interfaces
// ---------------------------------------------------------------------------

export interface CharityApprovalStrings {
  subject: string;
  preheader: string;
  /** "Congratulations — {{charityName}} is now a verified charity on Give Protocol." */
  congrats: string;
  profileLive: string;
  nextStepsHeader: string;
  step1: string;
  step2: string;
  step3: string;
  ctaText: string;
  closing: string;
}

export interface CharityRejectionStrings {
  subject: string;
  preheader: string;
  /** "Thank you for applying to Give Protocol on behalf of {{charityName}}." */
  thanks: string;
  unableToApprove: string;
  notJudgment: string;
  whatYouCanDoHeader: string;
  step1: string;
  step2: string;
  step3: string;
  closing: string;
  trustSafetySignoff: string;
}

export interface DonationReceiptStrings {
  /** "Your donation receipt from {{charityName}} — {{amount}}" */
  subject: string;
  preheader: string;
  /** "Thank you for your generosity. Your donation has been processed and delivered to {{charityName}}." */
  opening: string;
  receiptHeader: string;
  fieldDonor: string;
  fieldCharity: string;
  /** "Charity Tax ID (EIN)" — EIN is shown for US; non-US uses same label */
  fieldTaxId: string;
  fieldDate: string;
  fieldAmount: string;
  fieldPaymentMethod: string;
  fieldTransactionId: string;
  fieldProcessor: string;
  /**
   * Non-US charity tax note (translated).
   * "{{charityName}} is a verified nonprofit in {{charityCountry}}. Consult your local tax advisor to determine deductibility."
   * US legal text (501(c)(3)/IRS Pub. 1771) is NOT translated — always English.
   */
  nonUsTaxNote: string;
  closing: string;
  ctaText: string;
  signoff: string;
}

export interface UsernameReminderStrings {
  subject: string;
  preheader: string;
  body: string;
  yourUsernameLabel: string;
  signInCta: string;
  didntRequest: string;
}

export interface VolunteerApprovalStrings {
  /** "Your volunteer hours were approved by {{charityName}}" */
  subject: string;
  /** "{{hours}} hours logged and verified. Nice work." */
  preheader: string;
  /** "Great news — {{charityName}} has approved your volunteer hours." */
  opening: string;
  contributionHeader: string;
  fieldActivity: string;
  fieldDates: string;
  fieldHoursApproved: string;
  fieldApprovedBy: string;
  fieldVerificationDate: string;
  verifiedNote: string;
  ctaText: string;
  closing: string;
}

export interface VolunteerRejectionStrings {
  subject: string;
  /** "{{charityName}} reviewed your submission — here's the outcome." */
  preheader: string;
  /** "{{charityName}} has reviewed your submitted volunteer hours and was unable to approve them at this time." */
  opening: string;
  submissionHeader: string;
  fieldActivity: string;
  fieldDates: string;
  fieldHoursSubmitted: string;
  reasonHeader: string;
  notAReflection: string;
  whatNextHeader: string;
  /** "Reach out to {{charityName}} directly to clarify or resubmit with corrected details." */
  step1: string;
  step2: string;
  ctaText: string;
  closing: string;
}

export interface EmailStrings {
  /** BCP 47 language tag for html[lang] */
  lang: string;
  /** "ltr" or "rtl" */
  dir: string;
  /** "→" or "←" for RTL */
  arrow: string;
  /** "Hi {{name}}," */
  greeting: string;
  /** "Hi there," (when no name) */
  hiThere: string;
  /** "— The Give Protocol Team" */
  signoff: string;
  charityApproval: CharityApprovalStrings;
  charityRejection: CharityRejectionStrings;
  donationReceipt: DonationReceiptStrings;
  usernameReminder: UsernameReminderStrings;
  volunteerApproval: VolunteerApprovalStrings;
  volunteerRejection: VolunteerRejectionStrings;
}

// ---------------------------------------------------------------------------
// Translation data
// ---------------------------------------------------------------------------

const STRINGS: Record<EmailLocale, EmailStrings> = {
  en: {
    lang: "en", dir: "ltr", arrow: "→",
    greeting: "Hi {{name}},",
    hiThere: "Hi there,",
    signoff: "— The Give Protocol Team",
    charityApproval: {
      subject: "You're approved — welcome to Give Protocol",
      preheader: "Your charity is verified and live. Here's your portal.",
      congrats: "Congratulations — {{charityName}} is now a verified charity on Give Protocol.",
      profileLive: "Your profile is live. Donors can find you, give directly, and see the impact you create. No middlemen. No delays. Just support that arrives where it matters.",
      nextStepsHeader: "What to do next:",
      step1: "Sign in to your portal",
      step2: "Finish your public profile (mission, photos, wallets)",
      step3: "Share your Give Protocol link with your community",
      ctaText: "Open your charity portal →",
      closing: "We built Give Protocol so causes like yours can spend less time on fees and paperwork, and more time on the mission. Welcome aboard. We're glad you're here.",
    },
    charityRejection: {
      subject: "Update on your Give Protocol application",
      preheader: "We reviewed your submission — here's where we landed.",
      thanks: "Thank you for applying to Give Protocol on behalf of {{charityName}}.",
      unableToApprove: "After careful review, we're unable to approve this application at this time. The reason:",
      notJudgment: "This decision isn't a judgment of your mission. Our verification standards protect donors and every charity on the platform, and sometimes an application needs additional documentation or a change in eligibility status before we can move forward.",
      whatYouCanDoHeader: "What you can do:",
      step1: "Review the reason above and gather any missing documentation.",
      step2: "Reapply once the underlying items are resolved — most applicants who address the feedback are approved on their next submission.",
      step3: "Reply to this email if you'd like to discuss the decision or need clarification.",
      closing: "We appreciate the work you do and hope to welcome you to Give Protocol in the future.",
      trustSafetySignoff: "— The Give Protocol Trust & Safety Team",
    },
    donationReceipt: {
      subject: "Your donation receipt from {{charityName}} — {{amount}}",
      preheader: "Thank you. Keep this receipt for your records.",
      opening: "Thank you for your generosity. Your donation has been processed and delivered to {{charityName}}.",
      receiptHeader: "Official Donation Receipt",
      fieldDonor: "Donor",
      fieldCharity: "Charity",
      fieldTaxId: "Charity Tax ID (EIN)",
      fieldDate: "Date of donation",
      fieldAmount: "Amount",
      fieldPaymentMethod: "Payment method",
      fieldTransactionId: "Transaction ID",
      fieldProcessor: "Processor",
      nonUsTaxNote: "{{charityName}} is a verified nonprofit in {{charityCountry}}. Consult your local tax advisor to determine deductibility.",
      closing: "Every dollar you give reaches the causes you care about — transparently, and on-chain when applicable. That's the whole point.",
      ctaText: "View this donation in your account →",
      signoff: "With gratitude,",
    },
    usernameReminder: {
      subject: "Your Give Protocol username",
      preheader: "Someone (hopefully you) asked to be reminded.",
      body: "Someone requested a username reminder for the Give Protocol account tied to this email address.",
      yourUsernameLabel: "Your username:",
      signInCta: "Sign in →",
      didntRequest: "If you didn't request this, you can safely ignore this email — no changes have been made to your account. If you're seeing repeated reminders you didn't ask for, reply to this email and we'll investigate.",
    },
    volunteerApproval: {
      subject: "Your volunteer hours were approved by {{charityName}}",
      preheader: "{{hours}} hours logged and verified. Nice work.",
      opening: "Great news — {{charityName}} has approved your volunteer hours.",
      contributionHeader: "Approved contribution:",
      fieldActivity: "Role / activity",
      fieldDates: "Date(s) served",
      fieldHoursApproved: "Hours approved",
      fieldApprovedBy: "Approved by",
      fieldVerificationDate: "Verification date",
      verifiedNote: "Your service now appears on your verified volunteer record. Employers, schools, and communities can trust these hours because they're confirmed by the organization you served — not self-reported.",
      ctaText: "View your volunteer record →",
      closing: "Thank you for showing up. This is the work that moves the world forward.",
    },
    volunteerRejection: {
      subject: "Update on your volunteer hours submission",
      preheader: "{{charityName}} reviewed your submission — here's the outcome.",
      opening: "{{charityName}} has reviewed your submitted volunteer hours and was unable to approve them at this time.",
      submissionHeader: "Submission details:",
      fieldActivity: "Activity",
      fieldDates: "Date(s)",
      fieldHoursSubmitted: "Hours submitted",
      reasonHeader: "Reason from the organization:",
      notAReflection: "This isn't a reflection of your commitment to service. Often it's a matter of a missing detail, an activity that falls outside the scope the organization tracks, or a date that needs correction.",
      whatNextHeader: "What you can do next:",
      step1: "Reach out to {{charityName}} directly to clarify or resubmit with corrected details.",
      step2: "Log new hours at any time from your volunteer dashboard.",
      ctaText: "Go to your volunteer dashboard →",
      closing: "Thank you for the time you give. Keep going.",
    },
  },

  es: {
    lang: "es", dir: "ltr", arrow: "→",
    greeting: "Hola {{name}},",
    hiThere: "Hola,",
    signoff: "— El Equipo de Give Protocol",
    charityApproval: {
      subject: "Estás aprobado — bienvenido a Give Protocol",
      preheader: "Tu organización está verificada y activa. Aquí está tu portal.",
      congrats: "Felicitaciones — {{charityName}} ya es una organización verificada en Give Protocol.",
      profileLive: "Tu perfil está activo. Los donantes pueden encontrarte, dar directamente y ver el impacto que creas. Sin intermediarios. Sin demoras. Solo apoyo que llega donde importa.",
      nextStepsHeader: "Qué hacer a continuación:",
      step1: "Inicia sesión en tu portal",
      step2: "Completa tu perfil público (misión, fotos, carteras)",
      step3: "Comparte tu enlace de Give Protocol con tu comunidad",
      ctaText: "Abrir tu portal de organización →",
      closing: "Construimos Give Protocol para que causas como la tuya puedan dedicar menos tiempo a comisiones y papeleo, y más tiempo a la misión. Bienvenido a bordo. Nos alegra que estés aquí.",
    },
    charityRejection: {
      subject: "Actualización sobre tu solicitud en Give Protocol",
      preheader: "Revisamos tu solicitud — esto fue lo que decidimos.",
      thanks: "Gracias por solicitar en Give Protocol en nombre de {{charityName}}.",
      unableToApprove: "Después de una revisión cuidadosa, no podemos aprobar esta solicitud en este momento. El motivo:",
      notJudgment: "Esta decisión no es un juicio sobre tu misión. Nuestros estándares de verificación protegen a los donantes y a cada organización en la plataforma, y a veces una solicitud necesita documentación adicional o un cambio en el estado de elegibilidad antes de que podamos avanzar.",
      whatYouCanDoHeader: "Qué puedes hacer:",
      step1: "Revisa el motivo anterior y reúne cualquier documentación faltante.",
      step2: "Vuelve a solicitar una vez que los puntos subyacentes estén resueltos — la mayoría de los solicitantes que abordan los comentarios son aprobados en su próxima solicitud.",
      step3: "Responde a este correo si deseas hablar sobre la decisión o necesitas aclaraciones.",
      closing: "Apreciamos el trabajo que realizas y esperamos darte la bienvenida a Give Protocol en el futuro.",
      trustSafetySignoff: "— El Equipo de Confianza y Seguridad de Give Protocol",
    },
    donationReceipt: {
      subject: "Tu recibo de donación de {{charityName}} — {{amount}}",
      preheader: "Gracias. Conserva este recibo para tus registros.",
      opening: "Gracias por tu generosidad. Tu donación ha sido procesada y entregada a {{charityName}}.",
      receiptHeader: "Recibo Oficial de Donación",
      fieldDonor: "Donante",
      fieldCharity: "Organización",
      fieldTaxId: "ID Fiscal de la Organización (EIN)",
      fieldDate: "Fecha de donación",
      fieldAmount: "Importe",
      fieldPaymentMethod: "Método de pago",
      fieldTransactionId: "ID de transacción",
      fieldProcessor: "Procesador",
      nonUsTaxNote: "{{charityName}} es una organización sin fines de lucro verificada en {{charityCountry}}. Consulta a tu asesor fiscal local para determinar la deducibilidad.",
      closing: "Cada peso que donas llega a las causas que te importan — de forma transparente y en blockchain cuando corresponde. Ese es todo el sentido.",
      ctaText: "Ver esta donación en tu cuenta →",
      signoff: "Con gratitud,",
    },
    usernameReminder: {
      subject: "Tu nombre de usuario de Give Protocol",
      preheader: "Alguien (esperemos que tú) solicitó un recordatorio.",
      body: "Alguien solicitó un recordatorio de nombre de usuario para la cuenta de Give Protocol vinculada a esta dirección de correo electrónico.",
      yourUsernameLabel: "Tu nombre de usuario:",
      signInCta: "Iniciar sesión →",
      didntRequest: "Si no solicitaste esto, puedes ignorar este correo electrónico — no se han realizado cambios en tu cuenta. Si ves recordatorios repetidos que no pediste, responde a este correo y lo investigaremos.",
    },
    volunteerApproval: {
      subject: "Tus horas de voluntariado fueron aprobadas por {{charityName}}",
      preheader: "{{hours}} horas registradas y verificadas. Buen trabajo.",
      opening: "Buenas noticias — {{charityName}} ha aprobado tus horas de voluntariado.",
      contributionHeader: "Contribución aprobada:",
      fieldActivity: "Rol / actividad",
      fieldDates: "Fecha(s) de servicio",
      fieldHoursApproved: "Horas aprobadas",
      fieldApprovedBy: "Aprobado por",
      fieldVerificationDate: "Fecha de verificación",
      verifiedNote: "Tu servicio ahora aparece en tu registro verificado de voluntariado. Los empleadores, escuelas y comunidades pueden confiar en estas horas porque las confirma la organización a la que serviste, no son autodeclaradas.",
      ctaText: "Ver tu registro de voluntariado →",
      closing: "Gracias por aparecer. Este es el trabajo que mueve al mundo hacia adelante.",
    },
    volunteerRejection: {
      subject: "Actualización sobre tu envío de horas de voluntariado",
      preheader: "{{charityName}} revisó tu envío — aquí está el resultado.",
      opening: "{{charityName}} ha revisado tus horas de voluntariado enviadas y no pudo aprobarlas en este momento.",
      submissionHeader: "Detalles del envío:",
      fieldActivity: "Actividad",
      fieldDates: "Fecha(s)",
      fieldHoursSubmitted: "Horas enviadas",
      reasonHeader: "Motivo de la organización:",
      notAReflection: "Esto no es un reflejo de tu compromiso con el servicio. A menudo es una cuestión de un detalle faltante, una actividad que está fuera del alcance que la organización rastrea, o una fecha que necesita corrección.",
      whatNextHeader: "Qué puedes hacer a continuación:",
      step1: "Contacta directamente con {{charityName}} para aclarar o volver a enviar con detalles corregidos.",
      step2: "Registra nuevas horas en cualquier momento desde tu panel de voluntariado.",
      ctaText: "Ir a tu panel de voluntariado →",
      closing: "Gracias por el tiempo que dedicas. Sigue adelante.",
    },
  },

  de: {
    lang: "de", dir: "ltr", arrow: "→",
    greeting: "Hallo {{name}},",
    hiThere: "Hallo,",
    signoff: "— Das Give Protocol Team",
    charityApproval: {
      subject: "Genehmigt — willkommen bei Give Protocol",
      preheader: "Ihre Organisation ist verifiziert und live. Hier ist Ihr Portal.",
      congrats: "Herzlichen Glückwunsch — {{charityName}} ist jetzt eine verifizierte Organisation bei Give Protocol.",
      profileLive: "Ihr Profil ist aktiv. Spender können Sie finden, direkt spenden und die Wirkung sehen, die Sie erzielen. Keine Mittelsmänner. Keine Verzögerungen. Einfach Unterstützung, die ankommt, wo sie gebraucht wird.",
      nextStepsHeader: "Was als nächstes zu tun ist:",
      step1: "Melden Sie sich in Ihrem Portal an",
      step2: "Vervollständigen Sie Ihr öffentliches Profil (Mission, Fotos, Wallets)",
      step3: "Teilen Sie Ihren Give Protocol-Link mit Ihrer Community",
      ctaText: "Ihr Organisationsportal öffnen →",
      closing: "Wir haben Give Protocol gebaut, damit Organisationen wie Ihre weniger Zeit mit Gebühren und Papierkram verbringen und mehr Zeit für ihre Mission haben. Willkommen an Bord. Wir freuen uns, dass Sie da sind.",
    },
    charityRejection: {
      subject: "Aktualisierung zu Ihrer Give Protocol-Bewerbung",
      preheader: "Wir haben Ihre Bewerbung geprüft — hier ist unser Ergebnis.",
      thanks: "Vielen Dank für Ihre Bewerbung bei Give Protocol im Namen von {{charityName}}.",
      unableToApprove: "Nach sorgfältiger Prüfung können wir diese Bewerbung derzeit nicht genehmigen. Der Grund:",
      notJudgment: "Diese Entscheidung ist kein Urteil über Ihre Mission. Unsere Verifizierungsstandards schützen Spender und jede Organisation auf der Plattform, und manchmal benötigt eine Bewerbung zusätzliche Dokumentation oder eine Änderung des Berechtigungsstatus, bevor wir fortfahren können.",
      whatYouCanDoHeader: "Was Sie tun können:",
      step1: "Überprüfen Sie den obigen Grund und sammeln Sie fehlende Unterlagen.",
      step2: "Bewerben Sie sich erneut, sobald die zugrundeliegenden Punkte geklärt sind — die meisten Bewerber, die das Feedback berücksichtigen, werden bei ihrer nächsten Einreichung genehmigt.",
      step3: "Antworten Sie auf diese E-Mail, wenn Sie die Entscheidung besprechen oder Klärung benötigen.",
      closing: "Wir schätzen Ihre Arbeit und hoffen, Sie in Zukunft bei Give Protocol begrüßen zu können.",
      trustSafetySignoff: "— Das Give Protocol Vertrauen & Sicherheit Team",
    },
    donationReceipt: {
      subject: "Ihre Spendenquittung von {{charityName}} — {{amount}}",
      preheader: "Danke. Bewahren Sie diese Quittung für Ihre Unterlagen auf.",
      opening: "Vielen Dank für Ihre Großzügigkeit. Ihre Spende wurde verarbeitet und an {{charityName}} weitergeleitet.",
      receiptHeader: "Offizielle Spendenquittung",
      fieldDonor: "Spender",
      fieldCharity: "Organisation",
      fieldTaxId: "Steuer-ID der Organisation (EIN)",
      fieldDate: "Datum der Spende",
      fieldAmount: "Betrag",
      fieldPaymentMethod: "Zahlungsmethode",
      fieldTransactionId: "Transaktions-ID",
      fieldProcessor: "Zahlungsabwickler",
      nonUsTaxNote: "{{charityName}} ist eine verifizierte gemeinnützige Organisation in {{charityCountry}}. Wenden Sie sich an Ihren lokalen Steuerberater, um die steuerliche Abzugsfähigkeit zu prüfen.",
      closing: "Jeder Cent, den Sie geben, erreicht die Anliegen, die Ihnen wichtig sind — transparent und on-chain, wenn zutreffend. Das ist der ganze Sinn.",
      ctaText: "Diese Spende in Ihrem Konto anzeigen →",
      signoff: "Mit Dankbarkeit,",
    },
    usernameReminder: {
      subject: "Ihr Give Protocol-Benutzername",
      preheader: "Jemand (hoffentlich Sie) hat um eine Erinnerung gebeten.",
      body: "Jemand hat eine Erinnerung für den Benutzernamen des Give Protocol-Kontos angefordert, das mit dieser E-Mail-Adresse verknüpft ist.",
      yourUsernameLabel: "Ihr Benutzername:",
      signInCta: "Anmelden →",
      didntRequest: "Falls Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren — es wurden keine Änderungen an Ihrem Konto vorgenommen. Falls Sie wiederholt Erinnerungen erhalten, die Sie nicht angefordert haben, antworten Sie auf diese E-Mail und wir werden nachforschen.",
    },
    volunteerApproval: {
      subject: "Ihre ehrenamtlichen Stunden wurden von {{charityName}} genehmigt",
      preheader: "{{hours}} Stunden erfasst und verifiziert. Gut gemacht.",
      opening: "Großartige Neuigkeiten — {{charityName}} hat Ihre ehrenamtlichen Stunden genehmigt.",
      contributionHeader: "Genehmigte Beiträge:",
      fieldActivity: "Rolle / Aktivität",
      fieldDates: "Einsatzdatum/-daten",
      fieldHoursApproved: "Genehmigte Stunden",
      fieldApprovedBy: "Genehmigt von",
      fieldVerificationDate: "Verifizierungsdatum",
      verifiedNote: "Ihr Einsatz erscheint nun in Ihrem verifizierten Ehrenamtsprotokoll. Arbeitgeber, Schulen und Gemeinschaften können diesen Stunden vertrauen, da sie von der Organisation bestätigt wurden, der Sie gedient haben — nicht selbst gemeldet.",
      ctaText: "Ihr Ehrenamtsprotokoll anzeigen →",
      closing: "Danke, dass Sie sich engagieren. Das ist die Arbeit, die die Welt voranbringt.",
    },
    volunteerRejection: {
      subject: "Aktualisierung zu Ihrer Ehrenamtsstunden-Einreichung",
      preheader: "{{charityName}} hat Ihre Einreichung geprüft — hier ist das Ergebnis.",
      opening: "{{charityName}} hat Ihre eingereichten ehrenamtlichen Stunden geprüft und konnte diese zum jetzigen Zeitpunkt nicht genehmigen.",
      submissionHeader: "Einreichungsdetails:",
      fieldActivity: "Aktivität",
      fieldDates: "Datum/Daten",
      fieldHoursSubmitted: "Eingereichte Stunden",
      reasonHeader: "Grund der Organisation:",
      notAReflection: "Dies ist kein Spiegel Ihres Engagements. Oft handelt es sich um ein fehlendes Detail, eine Aktivität, die außerhalb des verfolgten Bereichs der Organisation liegt, oder ein Datum, das korrigiert werden muss.",
      whatNextHeader: "Was Sie als nächstes tun können:",
      step1: "Kontaktieren Sie {{charityName}} direkt, um zu klären oder mit korrigierten Details neu einzureichen.",
      step2: "Erfassen Sie neue Stunden jederzeit über Ihr Ehrenamts-Dashboard.",
      ctaText: "Zu Ihrem Ehrenamts-Dashboard →",
      closing: "Danke für die Zeit, die Sie geben. Machen Sie weiter.",
    },
  },

  fr: {
    lang: "fr", dir: "ltr", arrow: "→",
    greeting: "Bonjour {{name}},",
    hiThere: "Bonjour,",
    signoff: "— L'équipe Give Protocol",
    charityApproval: {
      subject: "Vous êtes approuvé — bienvenue sur Give Protocol",
      preheader: "Votre organisation est vérifiée et en ligne. Voici votre portail.",
      congrats: "Félicitations — {{charityName}} est désormais une organisation vérifiée sur Give Protocol.",
      profileLive: "Votre profil est en ligne. Les donateurs peuvent vous trouver, donner directement et voir l'impact que vous créez. Sans intermédiaires. Sans délais. Juste un soutien qui arrive là où il compte.",
      nextStepsHeader: "Que faire ensuite :",
      step1: "Connectez-vous à votre portail",
      step2: "Complétez votre profil public (mission, photos, portefeuilles)",
      step3: "Partagez votre lien Give Protocol avec votre communauté",
      ctaText: "Ouvrir votre portail d'organisation →",
      closing: "Nous avons créé Give Protocol pour que des causes comme la vôtre puissent consacrer moins de temps aux frais et à la paperasse, et plus de temps à la mission. Bienvenue à bord. Nous sommes ravis de vous avoir.",
    },
    charityRejection: {
      subject: "Mise à jour sur votre candidature Give Protocol",
      preheader: "Nous avons examiné votre candidature — voici où nous en sommes.",
      thanks: "Merci d'avoir postulé à Give Protocol au nom de {{charityName}}.",
      unableToApprove: "Après examen attentif, nous ne pouvons pas approuver cette candidature pour le moment. La raison :",
      notJudgment: "Cette décision ne remet pas en cause votre mission. Nos normes de vérification protègent les donateurs et chaque organisation sur la plateforme, et parfois une candidature nécessite des documents supplémentaires ou un changement de statut d'éligibilité avant que nous puissions aller de l'avant.",
      whatYouCanDoHeader: "Que pouvez-vous faire :",
      step1: "Examinez la raison ci-dessus et rassemblez les documents manquants.",
      step2: "Postulez à nouveau une fois les problèmes sous-jacents résolus — la plupart des candidats qui tiennent compte des retours sont approuvés lors de leur prochaine soumission.",
      step3: "Répondez à cet e-mail si vous souhaitez discuter de la décision ou obtenir des éclaircissements.",
      closing: "Nous apprécions votre travail et espérons vous accueillir sur Give Protocol à l'avenir.",
      trustSafetySignoff: "— L'équipe Confiance & Sécurité de Give Protocol",
    },
    donationReceipt: {
      subject: "Votre reçu de don de {{charityName}} — {{amount}}",
      preheader: "Merci. Conservez ce reçu pour vos dossiers.",
      opening: "Merci pour votre générosité. Votre don a été traité et remis à {{charityName}}.",
      receiptHeader: "Reçu de Don Officiel",
      fieldDonor: "Donateur",
      fieldCharity: "Organisation",
      fieldTaxId: "ID Fiscal de l'Organisation (EIN)",
      fieldDate: "Date du don",
      fieldAmount: "Montant",
      fieldPaymentMethod: "Mode de paiement",
      fieldTransactionId: "ID de transaction",
      fieldProcessor: "Processeur",
      nonUsTaxNote: "{{charityName}} est une organisation à but non lucratif vérifiée en {{charityCountry}}. Consultez votre conseiller fiscal local pour déterminer la déductibilité.",
      closing: "Chaque euro que vous donnez atteint les causes qui vous tiennent à cœur — de manière transparente et on-chain lorsque cela s'applique. C'est tout l'intérêt.",
      ctaText: "Afficher ce don dans votre compte →",
      signoff: "Avec gratitude,",
    },
    usernameReminder: {
      subject: "Votre nom d'utilisateur Give Protocol",
      preheader: "Quelqu'un (espérons-le, vous) a demandé un rappel.",
      body: "Quelqu'un a demandé un rappel du nom d'utilisateur pour le compte Give Protocol lié à cette adresse e-mail.",
      yourUsernameLabel: "Votre nom d'utilisateur :",
      signInCta: "Se connecter →",
      didntRequest: "Si vous n'avez pas fait cette demande, vous pouvez ignorer cet e-mail — aucune modification n'a été apportée à votre compte. Si vous recevez des rappels répétés que vous n'avez pas demandés, répondez à cet e-mail et nous enquêterons.",
    },
    volunteerApproval: {
      subject: "Vos heures de bénévolat ont été approuvées par {{charityName}}",
      preheader: "{{hours}} heures enregistrées et vérifiées. Beau travail.",
      opening: "Bonne nouvelle — {{charityName}} a approuvé vos heures de bénévolat.",
      contributionHeader: "Contribution approuvée :",
      fieldActivity: "Rôle / activité",
      fieldDates: "Date(s) de service",
      fieldHoursApproved: "Heures approuvées",
      fieldApprovedBy: "Approuvé par",
      fieldVerificationDate: "Date de vérification",
      verifiedNote: "Votre service apparaît désormais dans votre dossier bénévole vérifié. Les employeurs, les écoles et les communautés peuvent faire confiance à ces heures car elles sont confirmées par l'organisation que vous avez servie, et non auto-déclarées.",
      ctaText: "Afficher votre dossier bénévole →",
      closing: "Merci d'être présent. C'est ce travail qui fait avancer le monde.",
    },
    volunteerRejection: {
      subject: "Mise à jour sur votre soumission d'heures de bénévolat",
      preheader: "{{charityName}} a examiné votre soumission — voici le résultat.",
      opening: "{{charityName}} a examiné vos heures de bénévolat soumises et n'a pas pu les approuver pour le moment.",
      submissionHeader: "Détails de la soumission :",
      fieldActivity: "Activité",
      fieldDates: "Date(s)",
      fieldHoursSubmitted: "Heures soumises",
      reasonHeader: "Raison de l'organisation :",
      notAReflection: "Cela ne reflète pas votre engagement envers le service. Il s'agit souvent d'un détail manquant, d'une activité hors du cadre suivi par l'organisation, ou d'une date à corriger.",
      whatNextHeader: "Ce que vous pouvez faire maintenant :",
      step1: "Contactez directement {{charityName}} pour clarifier ou soumettre à nouveau avec les détails corrigés.",
      step2: "Enregistrez de nouvelles heures à tout moment depuis votre tableau de bord bénévole.",
      ctaText: "Accéder à votre tableau de bord bénévole →",
      closing: "Merci pour le temps que vous donnez. Continuez.",
    },
  },

  ja: {
    lang: "ja", dir: "ltr", arrow: "→",
    greeting: "{{name}} 様、",
    hiThere: "こんにちは、",
    signoff: "— Give Protocol チーム",
    charityApproval: {
      subject: "承認されました — Give Protocol へようこそ",
      preheader: "あなたの団体が認証されました。こちらがポータルです。",
      congrats: "おめでとうございます — {{charityName}} が Give Protocol の認証済み団体になりました。",
      profileLive: "プロフィールが公開されました。寄付者はあなたを見つけ、直接寄付し、あなたが生み出す影響を確認できます。仲介者なし、遅延なし。大切なところに届く支援だけです。",
      nextStepsHeader: "次のステップ：",
      step1: "ポータルにサインイン",
      step2: "公開プロフィールを完成させる（使命、写真、ウォレット）",
      step3: "あなたの Give Protocol リンクをコミュニティと共有する",
      ctaText: "慈善団体ポータルを開く →",
      closing: "Give Protocol を構築した目的は、あなたのような活動が費用や書類作業に費やす時間を減らし、使命にもっと時間を使えるようにすることです。ご参加を歓迎します。一緒に取り組みましょう。",
    },
    charityRejection: {
      subject: "Give Protocol への申請に関するお知らせ",
      preheader: "申請を審査しました — 結果をお知らせします。",
      thanks: "{{charityName}} を代表して Give Protocol へご申請いただきありがとうございます。",
      unableToApprove: "慎重に審査した結果、現時点ではこの申請を承認することができません。理由：",
      notJudgment: "この決定はあなたの使命を否定するものではありません。私たちの審査基準は寄付者とプラットフォーム上のすべての団体を保護しており、申請が前進するには追加書類や資格ステータスの変更が必要な場合があります。",
      whatYouCanDoHeader: "あなたができること：",
      step1: "上記の理由を確認し、不足している書類を揃えてください。",
      step2: "問題が解決したら再申請してください — フィードバックに対応した申請者のほとんどが次回の提出で承認されています。",
      step3: "決定について話し合いたい場合や説明が必要な場合は、このメールに返信してください。",
      closing: "あなたの活動に敬意を表し、将来 Give Protocol でお会いできることを願っています。",
      trustSafetySignoff: "— Give Protocol 信頼・安全チーム",
    },
    donationReceipt: {
      subject: "{{charityName}} からの寄付領収書 — {{amount}}",
      preheader: "ありがとうございます。この領収書を記録として保管してください。",
      opening: "ご寄付ありがとうございます。あなたの寄付は処理され、{{charityName}} に届けられました。",
      receiptHeader: "公式寄付領収書",
      fieldDonor: "寄付者",
      fieldCharity: "団体",
      fieldTaxId: "団体税務ID (EIN)",
      fieldDate: "寄付日",
      fieldAmount: "金額",
      fieldPaymentMethod: "支払い方法",
      fieldTransactionId: "取引ID",
      fieldProcessor: "決済会社",
      nonUsTaxNote: "{{charityName}} は{{charityCountry}}の認証済み非営利団体です。控除可能性については、地元の税務アドバイザーにご相談ください。",
      closing: "あなたが寄付した金額は、透明な形で、そして該当する場合はオンチェーンで、あなたが大切にする活動に届きます。それがすべての意義です。",
      ctaText: "アカウントでこの寄付を確認する →",
      signoff: "感謝を込めて、",
    },
    usernameReminder: {
      subject: "あなたの Give Protocol ユーザー名",
      preheader: "誰か（おそらくあなた）がリマインダーをリクエストしました。",
      body: "このメールアドレスに紐づく Give Protocol アカウントのユーザー名リマインダーがリクエストされました。",
      yourUsernameLabel: "あなたのユーザー名：",
      signInCta: "サインイン →",
      didntRequest: "このリクエストをしていない場合は、このメールを無視してかまいません — アカウントに変更はありません。頼んでいないリマインダーが繰り返し届く場合は、このメールに返信してください。調査いたします。",
    },
    volunteerApproval: {
      subject: "{{charityName}} があなたのボランティア時間を承認しました",
      preheader: "{{hours}} 時間が記録・確認されました。お疲れ様でした。",
      opening: "よいお知らせです — {{charityName}} があなたのボランティア時間を承認しました。",
      contributionHeader: "承認された貢献：",
      fieldActivity: "役割 / 活動",
      fieldDates: "活動日",
      fieldHoursApproved: "承認済み時間",
      fieldApprovedBy: "承認者",
      fieldVerificationDate: "確認日",
      verifiedNote: "あなたの活動は認証済みのボランティア記録に記載されました。雇用主、学校、コミュニティはこれらの時間を信頼できます。なぜなら、あなたが奉仕した組織による確認であり、自己申告ではないからです。",
      ctaText: "ボランティア記録を見る →",
      closing: "参加してくれてありがとう。これが世界を前進させる活動です。",
    },
    volunteerRejection: {
      subject: "ボランティア時間の申請に関するお知らせ",
      preheader: "{{charityName}} が申請を審査しました — 結果をお知らせします。",
      opening: "{{charityName}} は申請されたボランティア時間を審査しましたが、現時点では承認することができませんでした。",
      submissionHeader: "申請内容：",
      fieldActivity: "活動",
      fieldDates: "日付",
      fieldHoursSubmitted: "申請時間",
      reasonHeader: "組織からの理由：",
      notAReflection: "これはあなたの奉仕への意欲を否定するものではありません。多くの場合、詳細の欠落、組織が追跡する範囲外の活動、または修正が必要な日付の問題です。",
      whatNextHeader: "次のステップ：",
      step1: "{{charityName}} に直接連絡して確認するか、修正した詳細で再申請してください。",
      step2: "ボランティアダッシュボードからいつでも新しい時間を記録できます。",
      ctaText: "ボランティアダッシュボードへ →",
      closing: "あなたが捧げる時間に感謝します。続けてください。",
    },
  },

  "zh-CN": {
    lang: "zh-CN", dir: "ltr", arrow: "→",
    greeting: "您好，{{name}}，",
    hiThere: "您好，",
    signoff: "— Give Protocol 团队",
    charityApproval: {
      subject: "您已获批准 — 欢迎加入 Give Protocol",
      preheader: "您的慈善机构已通过认证并上线。这是您的门户。",
      congrats: "恭喜 — {{charityName}} 现已成为 Give Protocol 上的认证慈善机构。",
      profileLive: "您的页面已上线。捐赠者可以找到您、直接捐款并了解您创造的影响。没有中间人，没有延误，只有抵达真正需要的地方的支持。",
      nextStepsHeader: "接下来要做什么：",
      step1: "登录您的门户",
      step2: "完善您的公开页面（使命、照片、钱包）",
      step3: "与您的社区分享您的 Give Protocol 链接",
      ctaText: "打开您的慈善机构门户 →",
      closing: "我们创建 Give Protocol，是为了让像您这样的事业能够减少在费用和文书工作上花费的时间，把更多时间用于使命。欢迎加入。很高兴您在这里。",
    },
    charityRejection: {
      subject: "您的 Give Protocol 申请状态更新",
      preheader: "我们已审核您的申请 — 以下是我们的决定。",
      thanks: "感谢您代表 {{charityName}} 向 Give Protocol 提出申请。",
      unableToApprove: "经过仔细审查，我们目前无法批准此申请。原因：",
      notJudgment: "此决定并不是对您使命的否定。我们的认证标准保护捐赠者和平台上的每一个慈善机构，有时申请需要补充材料或更改资格状态才能继续推进。",
      whatYouCanDoHeader: "您可以做什么：",
      step1: "查看上述原因并收集任何缺失的文件。",
      step2: "解决相关问题后重新申请 — 大多数处理了反馈意见的申请人在下次提交时都会获得批准。",
      step3: "如果您想讨论此决定或需要说明，请回复此电子邮件。",
      closing: "感谢您所做的工作，希望未来能欢迎您加入 Give Protocol。",
      trustSafetySignoff: "— Give Protocol 信任与安全团队",
    },
    donationReceipt: {
      subject: "您对 {{charityName}} 的捐款收据 — {{amount}}",
      preheader: "感谢您。请保留此收据以备记录。",
      opening: "感谢您的慷慨。您的捐款已处理并送达 {{charityName}}。",
      receiptHeader: "官方捐款收据",
      fieldDonor: "捐款人",
      fieldCharity: "慈善机构",
      fieldTaxId: "机构税号 (EIN)",
      fieldDate: "捐款日期",
      fieldAmount: "金额",
      fieldPaymentMethod: "支付方式",
      fieldTransactionId: "交易 ID",
      fieldProcessor: "支付处理商",
      nonUsTaxNote: "{{charityName}} 是 {{charityCountry}} 的认证非营利组织。请咨询您当地的税务顾问以确定可抵扣性。",
      closing: "您捐出的每一分钱都会透明地到达您关心的事业 — 在适用时通过区块链完成。这就是整个意义所在。",
      ctaText: "在账户中查看此捐款 →",
      signoff: "谨致谢意，",
    },
    usernameReminder: {
      subject: "您的 Give Protocol 用户名",
      preheader: "有人（希望是您）请求发送此提醒。",
      body: "有人请求发送与此电子邮件地址关联的 Give Protocol 账户的用户名提醒。",
      yourUsernameLabel: "您的用户名：",
      signInCta: "登录 →",
      didntRequest: "如果您没有提出此请求，可以安全地忽略此电子邮件 — 您的帐户没有任何更改。如果您收到未请求的重复提醒，请回复此邮件，我们将进行调查。",
    },
    volunteerApproval: {
      subject: "您的志愿者时数已获 {{charityName}} 批准",
      preheader: "{{hours}} 小时已记录并核实。干得好。",
      opening: "好消息 — {{charityName}} 已批准您的志愿者时数。",
      contributionHeader: "已批准的贡献：",
      fieldActivity: "角色/活动",
      fieldDates: "服务日期",
      fieldHoursApproved: "批准时数",
      fieldApprovedBy: "批准人",
      fieldVerificationDate: "核实日期",
      verifiedNote: "您的服务现在出现在您的经验证志愿者记录中。雇主、学校和社区可以信任这些时数，因为它们由您服务的组织确认，而非自我申报。",
      ctaText: "查看您的志愿者记录 →",
      closing: "感谢您的出现。这就是推动世界前进的工作。",
    },
    volunteerRejection: {
      subject: "您的志愿者时数提交状态更新",
      preheader: "{{charityName}} 已审核您的提交 — 以下是结果。",
      opening: "{{charityName}} 已审核您提交的志愿者时数，但目前无法批准。",
      submissionHeader: "提交详情：",
      fieldActivity: "活动",
      fieldDates: "日期",
      fieldHoursSubmitted: "提交时数",
      reasonHeader: "组织的原因：",
      notAReflection: "这不是对您服务承诺的反映。通常是缺少某个细节、超出组织追踪范围的活动，或者日期需要更正。",
      whatNextHeader: "您接下来可以做什么：",
      step1: "直接联系 {{charityName}} 以澄清情况或重新提交更正后的详情。",
      step2: "随时从您的志愿者仪表板记录新时数。",
      ctaText: "前往志愿者仪表板 →",
      closing: "感谢您奉献的时间。继续前进。",
    },
  },

  "zh-TW": {
    lang: "zh-TW", dir: "ltr", arrow: "→",
    greeting: "您好，{{name}}，",
    hiThere: "您好，",
    signoff: "— Give Protocol 團隊",
    charityApproval: {
      subject: "您已獲批准 — 歡迎加入 Give Protocol",
      preheader: "您的慈善機構已通過認證並上線。這是您的入口。",
      congrats: "恭喜 — {{charityName}} 現已成為 Give Protocol 上的認證慈善機構。",
      profileLive: "您的頁面已上線。捐款人可以找到您、直接捐款並了解您所創造的影響。沒有中間人，沒有延誤，只有送達最需要之處的支持。",
      nextStepsHeader: "接下來要做什麼：",
      step1: "登入您的入口",
      step2: "完善您的公開頁面（使命、照片、錢包）",
      step3: "與您的社群分享您的 Give Protocol 連結",
      ctaText: "開啟您的慈善機構入口 →",
      closing: "我們創建 Give Protocol，是為了讓像您這樣的事業能夠減少在費用和文書工作上花費的時間，把更多時間用於使命。歡迎加入。很高興您在這裡。",
    },
    charityRejection: {
      subject: "您的 Give Protocol 申請狀態更新",
      preheader: "我們已審核您的申請 — 以下是我們的決定。",
      thanks: "感謝您代表 {{charityName}} 向 Give Protocol 提出申請。",
      unableToApprove: "經過仔細審查，我們目前無法批准此申請。原因：",
      notJudgment: "此決定並不是對您使命的否定。我們的認證標準保護捐款人和平台上的每一個慈善機構，有時申請需要補充資料或更改資格狀態才能繼續推進。",
      whatYouCanDoHeader: "您可以做什麼：",
      step1: "查看上述原因並收集任何缺失的文件。",
      step2: "解決相關問題後重新申請 — 大多數處理了反饋意見的申請人在下次提交時都會獲得批准。",
      step3: "如果您想討論此決定或需要說明，請回覆此電子郵件。",
      closing: "感謝您所做的工作，希望未來能歡迎您加入 Give Protocol。",
      trustSafetySignoff: "— Give Protocol 信任與安全團隊",
    },
    donationReceipt: {
      subject: "您對 {{charityName}} 的捐款收據 — {{amount}}",
      preheader: "感謝您。請保留此收據以備記錄。",
      opening: "感謝您的慷慨。您的捐款已處理並送達 {{charityName}}。",
      receiptHeader: "官方捐款收據",
      fieldDonor: "捐款人",
      fieldCharity: "慈善機構",
      fieldTaxId: "機構稅號 (EIN)",
      fieldDate: "捐款日期",
      fieldAmount: "金額",
      fieldPaymentMethod: "支付方式",
      fieldTransactionId: "交易 ID",
      fieldProcessor: "支付處理商",
      nonUsTaxNote: "{{charityName}} 是 {{charityCountry}} 的認證非營利組織。請諮詢您當地的稅務顧問以確定可抵扣性。",
      closing: "您捐出的每一分錢都會透明地到達您關心的事業 — 在適用時通過區塊鏈完成。這就是整個意義所在。",
      ctaText: "在帳戶中查看此捐款 →",
      signoff: "謹致謝意，",
    },
    usernameReminder: {
      subject: "您的 Give Protocol 使用者名稱",
      preheader: "有人（希望是您）請求發送此提醒。",
      body: "有人請求發送與此電子郵件地址關聯的 Give Protocol 帳戶的使用者名稱提醒。",
      yourUsernameLabel: "您的使用者名稱：",
      signInCta: "登入 →",
      didntRequest: "如果您沒有提出此請求，可以安全地忽略此電子郵件 — 您的帳戶沒有任何更改。如果您收到未請求的重複提醒，請回覆此郵件，我們將進行調查。",
    },
    volunteerApproval: {
      subject: "您的志工時數已獲 {{charityName}} 批准",
      preheader: "{{hours}} 小時已記錄並核實。幹得好。",
      opening: "好消息 — {{charityName}} 已批准您的志工時數。",
      contributionHeader: "已批准的貢獻：",
      fieldActivity: "角色/活動",
      fieldDates: "服務日期",
      fieldHoursApproved: "批准時數",
      fieldApprovedBy: "批准人",
      fieldVerificationDate: "核實日期",
      verifiedNote: "您的服務現在出現在您的經驗證志工記錄中。雇主、學校和社區可以信任這些時數，因為它們由您服務的組織確認，而非自我申報。",
      ctaText: "查看您的志工記錄 →",
      closing: "感謝您的出現。這就是推動世界前進的工作。",
    },
    volunteerRejection: {
      subject: "您的志工時數提交狀態更新",
      preheader: "{{charityName}} 已審核您的提交 — 以下是結果。",
      opening: "{{charityName}} 已審核您提交的志工時數，但目前無法批准。",
      submissionHeader: "提交詳情：",
      fieldActivity: "活動",
      fieldDates: "日期",
      fieldHoursSubmitted: "提交時數",
      reasonHeader: "組織的原因：",
      notAReflection: "這不是對您服務承諾的反映。通常是缺少某個細節、超出組織追蹤範圍的活動，或者日期需要更正。",
      whatNextHeader: "您接下來可以做什麼：",
      step1: "直接聯繫 {{charityName}} 以澄清情況或重新提交更正後的詳情。",
      step2: "隨時從您的志工儀表板記錄新時數。",
      ctaText: "前往志工儀表板 →",
      closing: "感謝您奉獻的時間。繼續前進。",
    },
  },

  th: {
    lang: "th", dir: "ltr", arrow: "→",
    greeting: "สวัสดี {{name}},",
    hiThere: "สวัสดี,",
    signoff: "— ทีม Give Protocol",
    charityApproval: {
      subject: "ได้รับการอนุมัติแล้ว — ยินดีต้อนรับสู่ Give Protocol",
      preheader: "องค์กรของคุณได้รับการยืนยันและเปิดตัวแล้ว นี่คือพอร์ทัลของคุณ",
      congrats: "ยินดีด้วย — {{charityName}} เป็นองค์กรการกุศลที่ได้รับการยืนยันบน Give Protocol แล้ว",
      profileLive: "โปรไฟล์ของคุณเปิดให้บริการแล้ว ผู้บริจาคสามารถค้นหาคุณ บริจาคโดยตรง และเห็นผลกระทบที่คุณสร้าง ไม่มีตัวกลาง ไม่มีความล่าช้า เพียงการสนับสนุนที่ไปถึงที่ที่สำคัญ",
      nextStepsHeader: "สิ่งที่ต้องทำต่อไป:",
      step1: "ลงชื่อเข้าใช้พอร์ทัลของคุณ",
      step2: "ทำโปรไฟล์สาธารณะให้สมบูรณ์ (ภารกิจ รูปภาพ กระเป๋าเงิน)",
      step3: "แบ่งปันลิงก์ Give Protocol ของคุณกับชุมชน",
      ctaText: "เปิดพอร์ทัลองค์กรของคุณ →",
      closing: "เราสร้าง Give Protocol เพื่อให้เหตุการณ์อย่างของคุณใช้เวลากับค่าธรรมเนียมและเอกสารน้อยลง และมีเวลาสำหรับภารกิจมากขึ้น ยินดีต้อนรับ เราดีใจที่คุณอยู่ที่นี่",
    },
    charityRejection: {
      subject: "อัปเดตเกี่ยวกับใบสมัครของคุณใน Give Protocol",
      preheader: "เราได้ตรวจสอบใบสมัครของคุณแล้ว — นี่คือสิ่งที่เราได้ตัดสิน",
      thanks: "ขอบคุณที่สมัครเข้าร่วม Give Protocol ในนามของ {{charityName}}",
      unableToApprove: "หลังจากการตรวจสอบอย่างรอบคอบ เราไม่สามารถอนุมัติใบสมัครนี้ในขณะนี้ได้ เหตุผล:",
      notJudgment: "การตัดสินใจนี้ไม่ได้เป็นการตัดสินถึงภารกิจของคุณ มาตรฐานการตรวจสอบของเราปกป้องผู้บริจาคและทุกองค์กรบนแพลตฟอร์ม และบางครั้งใบสมัครต้องการเอกสารเพิ่มเติมหรือการเปลี่ยนแปลงสถานะคุณสมบัติก่อนที่เราจะดำเนินการต่อได้",
      whatYouCanDoHeader: "สิ่งที่คุณสามารถทำได้:",
      step1: "ตรวจสอบเหตุผลข้างต้นและรวบรวมเอกสารที่ขาดหายไป",
      step2: "ยื่นใบสมัครใหม่เมื่อแก้ไขปัญหาที่เกี่ยวข้องแล้ว — ผู้สมัครส่วนใหญ่ที่แก้ไขตามข้อเสนอแนะจะได้รับการอนุมัติในการยื่นครั้งถัดไป",
      step3: "ตอบกลับอีเมลนี้หากคุณต้องการหารือเกี่ยวกับการตัดสินใจหรือต้องการคำชี้แจง",
      closing: "เราชื่นชมงานที่คุณทำและหวังว่าจะได้ต้อนรับคุณสู่ Give Protocol ในอนาคต",
      trustSafetySignoff: "— ทีมความน่าเชื่อถือและความปลอดภัยของ Give Protocol",
    },
    donationReceipt: {
      subject: "ใบเสร็จการบริจาคจาก {{charityName}} — {{amount}}",
      preheader: "ขอบคุณ กรุณาเก็บใบเสร็จนี้ไว้สำหรับบันทึกของคุณ",
      opening: "ขอบคุณสำหรับความเอื้อเฟื้อของคุณ การบริจาคของคุณได้รับการประมวลผลและส่งถึง {{charityName}} แล้ว",
      receiptHeader: "ใบเสร็จการบริจาคอย่างเป็นทางการ",
      fieldDonor: "ผู้บริจาค",
      fieldCharity: "องค์กรการกุศล",
      fieldTaxId: "หมายเลขประจำตัวภาษีขององค์กร (EIN)",
      fieldDate: "วันที่บริจาค",
      fieldAmount: "จำนวนเงิน",
      fieldPaymentMethod: "วิธีการชำระเงิน",
      fieldTransactionId: "รหัสธุรกรรม",
      fieldProcessor: "ผู้ประมวลผลการชำระเงิน",
      nonUsTaxNote: "{{charityName}} เป็นองค์กรไม่แสวงผลกำไรที่ได้รับการยืนยันใน {{charityCountry}} ปรึกษาที่ปรึกษาด้านภาษีในท้องถิ่นของคุณเพื่อกำหนดการหักลดหย่อน",
      closing: "ทุกบาทที่คุณให้จะไปถึงสาเหตุที่คุณสนใจ — อย่างโปร่งใสและบน blockchain เมื่อใช้งานได้ นั่นคือทั้งหมดของประเด็น",
      ctaText: "ดูการบริจาคนี้ในบัญชีของคุณ →",
      signoff: "ด้วยความขอบคุณ,",
    },
    usernameReminder: {
      subject: "ชื่อผู้ใช้ Give Protocol ของคุณ",
      preheader: "มีคนขอให้แจ้งเตือน (หวังว่าจะเป็นคุณ)",
      body: "มีคนขอให้ส่งการแจ้งเตือนชื่อผู้ใช้สำหรับบัญชี Give Protocol ที่เชื่อมโยงกับที่อยู่อีเมลนี้",
      yourUsernameLabel: "ชื่อผู้ใช้ของคุณ:",
      signInCta: "ลงชื่อเข้าใช้ →",
      didntRequest: "หากคุณไม่ได้ขอสิ่งนี้ คุณสามารถเพิกเฉยต่ออีเมลนี้ได้อย่างปลอดภัย — ไม่มีการเปลี่ยนแปลงใดๆ กับบัญชีของคุณ หากคุณเห็นการแจ้งเตือนซ้ำที่คุณไม่ได้ขอ โปรดตอบกลับอีเมลนี้แล้วเราจะตรวจสอบ",
    },
    volunteerApproval: {
      subject: "{{charityName}} ได้อนุมัติชั่วโมงอาสาสมัครของคุณแล้ว",
      preheader: "บันทึกและยืนยัน {{hours}} ชั่วโมงแล้ว ทำได้ดีมาก",
      opening: "ข่าวดี — {{charityName}} อนุมัติชั่วโมงอาสาสมัครของคุณแล้ว",
      contributionHeader: "ผลงานที่ได้รับการอนุมัติ:",
      fieldActivity: "บทบาท/กิจกรรม",
      fieldDates: "วันที่ให้บริการ",
      fieldHoursApproved: "ชั่วโมงที่อนุมัติ",
      fieldApprovedBy: "อนุมัติโดย",
      fieldVerificationDate: "วันที่ตรวจสอบ",
      verifiedNote: "บริการของคุณปรากฏในบันทึกอาสาสมัครที่ตรวจสอบแล้วของคุณแล้ว นายจ้าง โรงเรียน และชุมชนสามารถเชื่อถือชั่วโมงเหล่านี้ได้เพราะได้รับการยืนยันโดยองค์กรที่คุณรับใช้ ไม่ใช่การรายงานตนเอง",
      ctaText: "ดูบันทึกอาสาสมัครของคุณ →",
      closing: "ขอบคุณที่มา นี่คืองานที่ขับเคลื่อนโลกให้ก้าวไปข้างหน้า",
    },
    volunteerRejection: {
      subject: "อัปเดตเกี่ยวกับการส่งชั่วโมงอาสาสมัครของคุณ",
      preheader: "{{charityName}} ตรวจสอบการส่งของคุณแล้ว — นี่คือผลลัพธ์",
      opening: "{{charityName}} ได้ตรวจสอบชั่วโมงอาสาสมัครที่ส่งมาของคุณแล้ว แต่ไม่สามารถอนุมัติได้ในขณะนี้",
      submissionHeader: "รายละเอียดการส่ง:",
      fieldActivity: "กิจกรรม",
      fieldDates: "วันที่",
      fieldHoursSubmitted: "ชั่วโมงที่ส่ง",
      reasonHeader: "เหตุผลจากองค์กร:",
      notAReflection: "นี่ไม่ได้สะท้อนถึงความมุ่งมั่นของคุณในการให้บริการ มักจะเป็นเรื่องของรายละเอียดที่ขาดหายไป กิจกรรมที่อยู่นอกขอบเขตที่องค์กรติดตาม หรือวันที่ที่ต้องการการแก้ไข",
      whatNextHeader: "สิ่งที่คุณสามารถทำได้ต่อไป:",
      step1: "ติดต่อ {{charityName}} โดยตรงเพื่อชี้แจงหรือส่งใหม่พร้อมรายละเอียดที่แก้ไขแล้ว",
      step2: "บันทึกชั่วโมงใหม่ได้ตลอดเวลาจากแดชบอร์ดอาสาสมัครของคุณ",
      ctaText: "ไปที่แดชบอร์ดอาสาสมัครของคุณ →",
      closing: "ขอบคุณสำหรับเวลาที่คุณให้ ไปต่อเลย",
    },
  },

  vi: {
    lang: "vi", dir: "ltr", arrow: "→",
    greeting: "Xin chào {{name}},",
    hiThere: "Xin chào,",
    signoff: "— Đội ngũ Give Protocol",
    charityApproval: {
      subject: "Bạn đã được chấp thuận — Chào mừng đến với Give Protocol",
      preheader: "Tổ chức của bạn đã được xác minh và đang hoạt động. Đây là cổng thông tin của bạn.",
      congrats: "Chúc mừng — {{charityName}} hiện là tổ chức từ thiện đã được xác minh trên Give Protocol.",
      profileLive: "Hồ sơ của bạn đã hoạt động. Các nhà tài trợ có thể tìm thấy bạn, tài trợ trực tiếp và thấy tác động bạn tạo ra. Không có trung gian. Không có sự chậm trễ. Chỉ là sự hỗ trợ đến đúng nơi cần thiết.",
      nextStepsHeader: "Điều cần làm tiếp theo:",
      step1: "Đăng nhập vào cổng thông tin của bạn",
      step2: "Hoàn thiện hồ sơ công khai của bạn (sứ mệnh, ảnh, ví)",
      step3: "Chia sẻ liên kết Give Protocol của bạn với cộng đồng",
      ctaText: "Mở cổng tổ chức của bạn →",
      closing: "Chúng tôi xây dựng Give Protocol để các tổ chức như của bạn có thể dành ít thời gian hơn cho phí và thủ tục giấy tờ, và nhiều thời gian hơn cho sứ mệnh. Chào mừng bạn. Chúng tôi rất vui khi có bạn.",
    },
    charityRejection: {
      subject: "Cập nhật về đơn đăng ký Give Protocol của bạn",
      preheader: "Chúng tôi đã xem xét hồ sơ của bạn — đây là kết quả.",
      thanks: "Cảm ơn bạn đã đăng ký Give Protocol thay mặt cho {{charityName}}.",
      unableToApprove: "Sau khi xem xét kỹ lưỡng, chúng tôi không thể phê duyệt đơn đăng ký này vào thời điểm này. Lý do:",
      notJudgment: "Quyết định này không phải là sự phán xét về sứ mệnh của bạn. Các tiêu chuẩn xác minh của chúng tôi bảo vệ các nhà tài trợ và mọi tổ chức từ thiện trên nền tảng, và đôi khi một đơn đăng ký cần tài liệu bổ sung hoặc thay đổi trạng thái đủ điều kiện trước khi chúng tôi có thể tiến hành.",
      whatYouCanDoHeader: "Những gì bạn có thể làm:",
      step1: "Xem xét lý do trên và thu thập tài liệu còn thiếu.",
      step2: "Đăng ký lại sau khi các vấn đề cơ bản được giải quyết — hầu hết các ứng viên xử lý phản hồi đều được chấp thuận trong lần nộp tiếp theo.",
      step3: "Trả lời email này nếu bạn muốn thảo luận về quyết định hoặc cần giải thích.",
      closing: "Chúng tôi đánh giá cao công việc bạn làm và hy vọng được chào đón bạn vào Give Protocol trong tương lai.",
      trustSafetySignoff: "— Nhóm Tin cậy & An toàn Give Protocol",
    },
    donationReceipt: {
      subject: "Biên lai đóng góp của bạn từ {{charityName}} — {{amount}}",
      preheader: "Cảm ơn bạn. Hãy giữ biên lai này để lưu hồ sơ.",
      opening: "Cảm ơn sự hào phóng của bạn. Khoản đóng góp của bạn đã được xử lý và chuyển đến {{charityName}}.",
      receiptHeader: "Biên Lai Đóng Góp Chính Thức",
      fieldDonor: "Người đóng góp",
      fieldCharity: "Tổ chức",
      fieldTaxId: "Mã số thuế của tổ chức (EIN)",
      fieldDate: "Ngày đóng góp",
      fieldAmount: "Số tiền",
      fieldPaymentMethod: "Phương thức thanh toán",
      fieldTransactionId: "ID giao dịch",
      fieldProcessor: "Bộ xử lý thanh toán",
      nonUsTaxNote: "{{charityName}} là một tổ chức phi lợi nhuận được xác minh tại {{charityCountry}}. Hãy tham khảo ý kiến của cố vấn thuế địa phương để xác định khả năng khấu trừ.",
      closing: "Mỗi đồng bạn đóng góp sẽ đến với các mục tiêu bạn quan tâm — một cách minh bạch và on-chain khi có thể. Đó là toàn bộ ý nghĩa.",
      ctaText: "Xem khoản đóng góp này trong tài khoản của bạn →",
      signoff: "Với lòng biết ơn,",
    },
    usernameReminder: {
      subject: "Tên người dùng Give Protocol của bạn",
      preheader: "Ai đó (hy vọng là bạn) đã yêu cầu nhắc nhở.",
      body: "Ai đó đã yêu cầu nhắc nhở tên người dùng cho tài khoản Give Protocol được liên kết với địa chỉ email này.",
      yourUsernameLabel: "Tên người dùng của bạn:",
      signInCta: "Đăng nhập →",
      didntRequest: "Nếu bạn không yêu cầu điều này, bạn có thể bỏ qua email này một cách an toàn — không có thay đổi nào được thực hiện đối với tài khoản của bạn. Nếu bạn thấy các nhắc nhở lặp lại mà bạn không yêu cầu, hãy trả lời email này và chúng tôi sẽ điều tra.",
    },
    volunteerApproval: {
      subject: "Giờ tình nguyện của bạn đã được {{charityName}} chấp thuận",
      preheader: "{{hours}} giờ đã được ghi nhận và xác minh. Tốt lắm.",
      opening: "Tin vui — {{charityName}} đã chấp thuận giờ tình nguyện của bạn.",
      contributionHeader: "Đóng góp được chấp thuận:",
      fieldActivity: "Vai trò/hoạt động",
      fieldDates: "Ngày phục vụ",
      fieldHoursApproved: "Số giờ được duyệt",
      fieldApprovedBy: "Được duyệt bởi",
      fieldVerificationDate: "Ngày xác minh",
      verifiedNote: "Hoạt động phục vụ của bạn hiện xuất hiện trên hồ sơ tình nguyện đã được xác minh. Các nhà tuyển dụng, trường học và cộng đồng có thể tin tưởng vào những giờ này vì chúng được xác nhận bởi tổ chức bạn đã phục vụ — không phải tự khai.",
      ctaText: "Xem hồ sơ tình nguyện của bạn →",
      closing: "Cảm ơn bạn đã có mặt. Đây là công việc đưa thế giới tiến lên.",
    },
    volunteerRejection: {
      subject: "Cập nhật về đơn gửi giờ tình nguyện của bạn",
      preheader: "{{charityName}} đã xem xét hồ sơ của bạn — đây là kết quả.",
      opening: "{{charityName}} đã xem xét giờ tình nguyện bạn đã nộp và không thể phê duyệt vào thời điểm này.",
      submissionHeader: "Chi tiết nộp hồ sơ:",
      fieldActivity: "Hoạt động",
      fieldDates: "Ngày",
      fieldHoursSubmitted: "Giờ đã nộp",
      reasonHeader: "Lý do từ tổ chức:",
      notAReflection: "Đây không phải là phản ánh về cam kết phục vụ của bạn. Thường đây là vấn đề về chi tiết thiếu, một hoạt động nằm ngoài phạm vi tổ chức theo dõi, hoặc ngày cần được chỉnh sửa.",
      whatNextHeader: "Những gì bạn có thể làm tiếp theo:",
      step1: "Liên hệ trực tiếp với {{charityName}} để làm rõ hoặc nộp lại với thông tin đã chỉnh sửa.",
      step2: "Ghi nhận giờ mới bất cứ lúc nào từ bảng điều khiển tình nguyện của bạn.",
      ctaText: "Đến bảng điều khiển tình nguyện →",
      closing: "Cảm ơn vì thời gian bạn đã dành. Hãy tiếp tục.",
    },
  },

  ko: {
    lang: "ko", dir: "ltr", arrow: "→",
    greeting: "안녕하세요, {{name}}님,",
    hiThere: "안녕하세요,",
    signoff: "— Give Protocol 팀",
    charityApproval: {
      subject: "승인이 완료되었습니다 — Give Protocol에 오신 것을 환영합니다",
      preheader: "귀하의 단체가 인증되어 활성화되었습니다. 포털을 확인하세요.",
      congrats: "축하합니다 — {{charityName}}이(가) Give Protocol의 인증된 단체가 되었습니다.",
      profileLive: "프로필이 활성화되었습니다. 기부자들이 귀하를 찾고, 직접 기부하고, 귀하가 만들어내는 영향을 볼 수 있습니다. 중간 단계 없이, 지연 없이. 진정으로 필요한 곳에 전달되는 지원입니다.",
      nextStepsHeader: "다음 할 일:",
      step1: "포털에 로그인하세요",
      step2: "공개 프로필 완성하기 (사명, 사진, 지갑)",
      step3: "Give Protocol 링크를 커뮤니티와 공유하세요",
      ctaText: "단체 포털 열기 →",
      closing: "Give Protocol을 만든 이유는 귀하와 같은 단체가 수수료와 서류 작업에 쏟는 시간을 줄이고 사명에 더 많은 시간을 쓸 수 있도록 하기 위해서입니다. 환영합니다. 함께하게 되어 기쁩니다.",
    },
    charityRejection: {
      subject: "Give Protocol 신청 현황 업데이트",
      preheader: "귀하의 신청서를 검토했습니다 — 검토 결과를 알려드립니다.",
      thanks: "{{charityName}}을 대신하여 Give Protocol에 신청해 주셔서 감사합니다.",
      unableToApprove: "신중한 검토 끝에, 현재로서는 이 신청을 승인하기 어렵습니다. 이유:",
      notJudgment: "이 결정은 귀하의 사명에 대한 판단이 아닙니다. 저희의 인증 기준은 기부자와 플랫폼의 모든 단체를 보호하기 위한 것이며, 때로는 신청서에 추가 서류나 자격 상태 변경이 필요할 수 있습니다.",
      whatYouCanDoHeader: "취할 수 있는 조치:",
      step1: "위의 이유를 검토하고 누락된 서류를 준비하세요.",
      step2: "관련 문제가 해결되면 다시 신청하세요 — 피드백을 반영한 대부분의 신청자는 다음 제출 시 승인됩니다.",
      step3: "결정에 대해 논의하거나 설명이 필요하시면 이 이메일에 답장해 주세요.",
      closing: "귀하의 활동에 감사드리며, 앞으로 Give Protocol에서 함께하게 되길 바랍니다.",
      trustSafetySignoff: "— Give Protocol 신뢰 및 안전 팀",
    },
    donationReceipt: {
      subject: "{{charityName}}에 대한 기부 영수증 — {{amount}}",
      preheader: "감사합니다. 이 영수증을 기록을 위해 보관해 주세요.",
      opening: "아낌없는 기부에 감사드립니다. 귀하의 기부금이 처리되어 {{charityName}}에 전달되었습니다.",
      receiptHeader: "공식 기부 영수증",
      fieldDonor: "기부자",
      fieldCharity: "단체",
      fieldTaxId: "기관 세금 ID (EIN)",
      fieldDate: "기부 날짜",
      fieldAmount: "금액",
      fieldPaymentMethod: "결제 방법",
      fieldTransactionId: "거래 ID",
      fieldProcessor: "결제 처리업체",
      nonUsTaxNote: "{{charityName}}은(는) {{charityCountry}}의 인증된 비영리 단체입니다. 공제 가능 여부는 현지 세무 전문가에게 문의하세요.",
      closing: "귀하가 기부한 모든 금액은 투명하게, 그리고 해당하는 경우 온체인으로 귀하가 소중히 여기는 곳에 전달됩니다. 그것이 전부입니다.",
      ctaText: "내 계정에서 이 기부 보기 →",
      signoff: "감사의 마음을 담아,",
    },
    usernameReminder: {
      subject: "귀하의 Give Protocol 사용자 이름",
      preheader: "누군가가 (바라건대 귀하가) 알림을 요청했습니다.",
      body: "이 이메일 주소와 연결된 Give Protocol 계정의 사용자 이름 알림이 요청되었습니다.",
      yourUsernameLabel: "귀하의 사용자 이름:",
      signInCta: "로그인 →",
      didntRequest: "이것을 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다 — 계정에 변경 사항이 없습니다. 요청하지 않은 반복 알림을 받고 계시다면 이 이메일에 답장해 주시면 조사하겠습니다.",
    },
    volunteerApproval: {
      subject: "귀하의 봉사 시간이 {{charityName}}에 의해 승인되었습니다",
      preheader: "{{hours}}시간이 기록되고 확인되었습니다. 수고하셨습니다.",
      opening: "좋은 소식입니다 — {{charityName}}이(가) 귀하의 봉사 시간을 승인했습니다.",
      contributionHeader: "승인된 봉사 내역:",
      fieldActivity: "역할/활동",
      fieldDates: "봉사 날짜",
      fieldHoursApproved: "승인된 시간",
      fieldApprovedBy: "승인자",
      fieldVerificationDate: "확인 날짜",
      verifiedNote: "귀하의 봉사 활동이 인증된 봉사 기록에 등록되었습니다. 고용주, 학교, 지역사회가 이 시간을 신뢰할 수 있는 이유는 자기 신고가 아닌, 귀하가 봉사한 단체에서 확인해 주었기 때문입니다.",
      ctaText: "봉사 기록 보기 →",
      closing: "함께해 주셔서 감사합니다. 이것이 세상을 앞으로 나아가게 하는 일입니다.",
    },
    volunteerRejection: {
      subject: "봉사 시간 제출 현황 업데이트",
      preheader: "{{charityName}}이(가) 귀하의 제출서를 검토했습니다 — 결과를 알려드립니다.",
      opening: "{{charityName}}이(가) 제출된 봉사 시간을 검토했지만 현재로서는 승인하기 어렵습니다.",
      submissionHeader: "제출 내역:",
      fieldActivity: "활동",
      fieldDates: "날짜",
      fieldHoursSubmitted: "제출 시간",
      reasonHeader: "단체의 사유:",
      notAReflection: "이는 봉사에 대한 귀하의 헌신을 평가하는 것이 아닙니다. 흔히 빠진 세부 사항, 단체가 추적하는 범위를 벗어난 활동, 또는 수정이 필요한 날짜 문제일 수 있습니다.",
      whatNextHeader: "다음으로 할 수 있는 일:",
      step1: "{{charityName}}에 직접 연락하여 확인하거나 수정된 내용으로 재제출하세요.",
      step2: "봉사 활동 대시보드에서 언제든지 새 시간을 기록하세요.",
      ctaText: "봉사 대시보드로 이동 →",
      closing: "귀하가 헌신하는 시간에 감사드립니다. 계속 나아가세요.",
    },
  },

  ar: {
    lang: "ar", dir: "rtl", arrow: "←",
    greeting: "مرحبًا {{name}}،",
    hiThere: "مرحبًا،",
    signoff: "— فريق Give Protocol",
    charityApproval: {
      subject: "تمت الموافقة عليك — مرحبًا بك في Give Protocol",
      preheader: "تم التحقق من مؤسستك الخيرية وأصبحت نشطة. إليك بوابتك.",
      congrats: "تهانينا — {{charityName}} أصبحت الآن منظمة خيرية موثقة على Give Protocol.",
      profileLive: "ملفك الشخصي نشط الآن. يمكن للمانحين العثور عليك والتبرع مباشرةً ورؤية التأثير الذي تحدثه. بلا وسطاء. بلا تأخير. مجرد دعم يصل إلى حيث يهمّ.",
      nextStepsHeader: "ما يجب فعله بعد ذلك:",
      step1: "سجّل الدخول إلى بوابتك",
      step2: "أكمل ملفك الشخصي العام (الرسالة والصور والمحافظ)",
      step3: "شارك رابط Give Protocol الخاص بك مع مجتمعك",
      ctaText: "افتح بوابة مؤسستك الخيرية ←",
      closing: "لقد بنينا Give Protocol حتى تتمكن قضايا مثل قضيتك من قضاء وقت أقل في الرسوم والأعمال الورقية، ووقت أطول في تحقيق الرسالة. أهلاً بك. يسعدنا وجودك معنا.",
    },
    charityRejection: {
      subject: "تحديث بشأن طلبك في Give Protocol",
      preheader: "راجعنا طلبك — إليك ما توصلنا إليه.",
      thanks: "شكرًا لك على التقدم إلى Give Protocol نيابةً عن {{charityName}}.",
      unableToApprove: "بعد مراجعة دقيقة، لا يمكننا الموافقة على هذا الطلب في الوقت الحالي. السبب:",
      notJudgment: "هذا القرار ليس حكمًا على رسالتك. تحمي معايير التحقق لدينا المانحين وكل منظمة خيرية على المنصة، وقد تحتاج بعض الطلبات أحيانًا إلى وثائق إضافية أو تغيير في حالة الأهلية قبل المضي قدمًا.",
      whatYouCanDoHeader: "ما يمكنك فعله:",
      step1: "راجع السبب أعلاه واجمع أي وثائق مفقودة.",
      step2: "تقدم مجددًا بعد حل المشكلات الأساسية — يحصل معظم المتقدمين الذين يعالجون الملاحظات على الموافقة في تقديمهم التالي.",
      step3: "ردّ على هذا البريد الإلكتروني إذا كنت ترغب في مناقشة القرار أو تحتاج إلى توضيح.",
      closing: "نقدّر عملك ونأمل في الترحيب بك في Give Protocol في المستقبل.",
      trustSafetySignoff: "— فريق الثقة والسلامة في Give Protocol",
    },
    donationReceipt: {
      subject: "إيصال تبرعك من {{charityName}} — {{amount}}",
      preheader: "شكرًا لك. احتفظ بهذا الإيصال لسجلاتك.",
      opening: "شكرًا لك على كرمك. تمت معالجة تبرعك وتسليمه إلى {{charityName}}.",
      receiptHeader: "إيصال التبرع الرسمي",
      fieldDonor: "المتبرع",
      fieldCharity: "المنظمة الخيرية",
      fieldTaxId: "الرقم الضريبي للمنظمة (EIN)",
      fieldDate: "تاريخ التبرع",
      fieldAmount: "المبلغ",
      fieldPaymentMethod: "طريقة الدفع",
      fieldTransactionId: "معرّف المعاملة",
      fieldProcessor: "معالج الدفع",
      nonUsTaxNote: "{{charityName}} منظمة غير ربحية موثقة في {{charityCountry}}. استشر مستشارك الضريبي المحلي لتحديد إمكانية الخصم.",
      closing: "كل مبلغ تتبرع به يصل إلى القضايا التي تهتم بها — بشفافية وعبر البلوكشين عند الانطباق. هذا هو كل الهدف.",
      ctaText: "عرض هذا التبرع في حسابك ←",
      signoff: "مع الامتنان،",
    },
    usernameReminder: {
      subject: "اسم المستخدم الخاص بك في Give Protocol",
      preheader: "طلب شخص ما (نأمل أنك أنت) تذكيرًا.",
      body: "طلب شخص ما تذكيرًا باسم المستخدم لحساب Give Protocol المرتبط بعنوان البريد الإلكتروني هذا.",
      yourUsernameLabel: "اسم المستخدم الخاص بك:",
      signInCta: "تسجيل الدخول ←",
      didntRequest: "إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني بأمان — لم يُجرَ أي تغيير على حسابك. إذا كنت ترى تذكيرات متكررة لم تطلبها، فرد على هذا البريد الإلكتروني وسنتحقق من الأمر.",
    },
    volunteerApproval: {
      subject: "تمت الموافقة على ساعات تطوعك من قِبل {{charityName}}",
      preheader: "تم تسجيل {{hours}} ساعة والتحقق منها. عمل رائع.",
      opening: "أخبار رائعة — وافقت {{charityName}} على ساعات تطوعك.",
      contributionHeader: "المساهمة المعتمدة:",
      fieldActivity: "الدور / النشاط",
      fieldDates: "تاريخ/تواريخ الخدمة",
      fieldHoursApproved: "الساعات المعتمدة",
      fieldApprovedBy: "معتمد من",
      fieldVerificationDate: "تاريخ التحقق",
      verifiedNote: "يظهر عملك الآن في سجل تطوعك الموثق. يمكن لأصحاب العمل والمدارس والمجتمعات الوثوق بهذه الساعات لأنها مؤكدة من قِبل المنظمة التي خدمتها، وليست مُبلَّغًا عنها ذاتيًا.",
      ctaText: "عرض سجل تطوعك ←",
      closing: "شكرًا لك على حضورك. هذا هو العمل الذي يدفع العالم إلى الأمام.",
    },
    volunteerRejection: {
      subject: "تحديث بشأن تقديم ساعات تطوعك",
      preheader: "راجعت {{charityName}} تقديمك — إليك النتيجة.",
      opening: "راجعت {{charityName}} ساعات التطوع التي قدمتها ولم تتمكن من الموافقة عليها في الوقت الحالي.",
      submissionHeader: "تفاصيل التقديم:",
      fieldActivity: "النشاط",
      fieldDates: "التاريخ/التواريخ",
      fieldHoursSubmitted: "الساعات المُقدَّمة",
      reasonHeader: "السبب من المنظمة:",
      notAReflection: "هذا لا يعكس التزامك بالخدمة. كثيرًا ما يكون الأمر متعلقًا بتفصيل مفقود، أو نشاط خارج نطاق ما تتبعه المنظمة، أو تاريخ يحتاج إلى تصحيح.",
      whatNextHeader: "ما يمكنك فعله بعد ذلك:",
      step1: "تواصل مباشرةً مع {{charityName}} للتوضيح أو إعادة التقديم بالتفاصيل المصحّحة.",
      step2: "سجّل ساعات جديدة في أي وقت من لوحة تحكم التطوع الخاصة بك.",
      ctaText: "انتقل إلى لوحة تحكم التطوع الخاصة بك ←",
      closing: "شكرًا للوقت الذي تقدمه. استمر.",
    },
  },

  hi: {
    lang: "hi", dir: "ltr", arrow: "→",
    greeting: "नमस्ते {{name}},",
    hiThere: "नमस्ते,",
    signoff: "— Give Protocol टीम",
    charityApproval: {
      subject: "आप स्वीकृत हैं — Give Protocol में आपका स्वागत है",
      preheader: "आपकी चैरिटी सत्यापित और लाइव है। यहाँ आपका पोर्टल है।",
      congrats: "बधाई — {{charityName}} अब Give Protocol पर एक सत्यापित चैरिटी है।",
      profileLive: "आपका प्रोफ़ाइल लाइव है। दाता आपको खोज सकते हैं, सीधे दे सकते हैं, और आपके द्वारा बनाए गए प्रभाव को देख सकते हैं। कोई बिचौलिया नहीं। कोई देरी नहीं। बस वहाँ पहुँचने वाला समर्थन जहाँ इसकी ज़रूरत है।",
      nextStepsHeader: "आगे क्या करें:",
      step1: "अपने पोर्टल में साइन इन करें",
      step2: "अपना सार्वजनिक प्रोफ़ाइल पूरा करें (मिशन, फ़ोटो, वॉलेट)",
      step3: "अपने Give Protocol लिंक को अपने समुदाय के साथ साझा करें",
      ctaText: "अपना चैरिटी पोर्टल खोलें →",
      closing: "हमने Give Protocol इसलिए बनाया ताकि आप जैसे कारण फीस और कागज़ी कार्रवाई पर कम समय बिताएं, और मिशन पर अधिक समय। आपका स्वागत है। हमें खुशी है कि आप यहाँ हैं।",
    },
    charityRejection: {
      subject: "आपके Give Protocol आवेदन पर अपडेट",
      preheader: "हमने आपके आवेदन की समीक्षा की — यहाँ हमारा निर्णय है।",
      thanks: "{{charityName}} की ओर से Give Protocol में आवेदन करने के लिए धन्यवाद।",
      unableToApprove: "सावधानीपूर्वक समीक्षा के बाद, हम इस समय इस आवेदन को स्वीकृत नहीं कर सकते। कारण:",
      notJudgment: "यह निर्णय आपके मिशन का मूल्यांकन नहीं है। हमारे सत्यापन मानक दाताओं और प्लेटफ़ॉर्म पर प्रत्येक चैरिटी की रक्षा करते हैं, और कभी-कभी एक आवेदन को आगे बढ़ने से पहले अतिरिक्त दस्तावेज़ीकरण या पात्रता स्थिति में बदलाव की आवश्यकता होती है।",
      whatYouCanDoHeader: "आप क्या कर सकते हैं:",
      step1: "ऊपर दिए गए कारण की समीक्षा करें और कोई भी लापता दस्तावेज़ एकत्र करें।",
      step2: "मूल समस्याओं के हल होने के बाद पुनः आवेदन करें — जो आवेदक फ़ीडबैक को संबोधित करते हैं उनमें से अधिकांश अपनी अगली प्रस्तुति में अनुमोदित हो जाते हैं।",
      step3: "यदि आप निर्णय पर चर्चा करना चाहते हैं या स्पष्टीकरण की आवश्यकता है, तो इस ईमेल का जवाब दें।",
      closing: "हम आपके कार्य की सराहना करते हैं और भविष्य में Give Protocol में आपका स्वागत करने की उम्मीद करते हैं।",
      trustSafetySignoff: "— Give Protocol विश्वास और सुरक्षा टीम",
    },
    donationReceipt: {
      subject: "{{charityName}} से आपकी दान रसीद — {{amount}}",
      preheader: "धन्यवाद। इस रसीद को अपने रिकॉर्ड के लिए रखें।",
      opening: "आपकी उदारता के लिए धन्यवाद। आपका दान संसाधित हो गया है और {{charityName}} को दिया गया है।",
      receiptHeader: "आधिकारिक दान रसीद",
      fieldDonor: "दाता",
      fieldCharity: "चैरिटी",
      fieldTaxId: "संगठन कर आईडी (EIN)",
      fieldDate: "दान की तारीख",
      fieldAmount: "राशि",
      fieldPaymentMethod: "भुगतान विधि",
      fieldTransactionId: "लेन-देन ID",
      fieldProcessor: "भुगतान प्रोसेसर",
      nonUsTaxNote: "{{charityName}} {{charityCountry}} में एक सत्यापित गैर-लाभकारी संस्था है। कटौती की पात्रता निर्धारित करने के लिए अपने स्थानीय कर सलाहकार से परामर्श करें।",
      closing: "आपके द्वारा दिया गया हर रुपया आपकी परवाह के कारणों तक पहुँचता है — पारदर्शी रूप से, और जहाँ लागू हो वहाँ ऑन-चेन। यही सारा मतलब है।",
      ctaText: "अपने खाते में यह दान देखें →",
      signoff: "कृतज्ञता के साथ,",
    },
    usernameReminder: {
      subject: "आपका Give Protocol उपयोगकर्ता नाम",
      preheader: "किसी ने (उम्मीद है आपने) अनुस्मारक के लिए अनुरोध किया।",
      body: "किसी ने इस ईमेल पते से जुड़े Give Protocol खाते के लिए उपयोगकर्ता नाम अनुस्मारक का अनुरोध किया।",
      yourUsernameLabel: "आपका उपयोगकर्ता नाम:",
      signInCta: "साइन इन करें →",
      didntRequest: "यदि आपने यह अनुरोध नहीं किया है, तो आप इस ईमेल को सुरक्षित रूप से अनदेखा कर सकते हैं — आपके खाते में कोई बदलाव नहीं किया गया है। यदि आपको बिना अनुरोध के बार-बार अनुस्मारक मिल रहे हैं, तो इस ईमेल का जवाब दें और हम जाँच करेंगे।",
    },
    volunteerApproval: {
      subject: "{{charityName}} ने आपके स्वयंसेवक घंटे अनुमोदित किए",
      preheader: "{{hours}} घंटे लॉग और सत्यापित। शानदार काम।",
      opening: "शानदार खबर — {{charityName}} ने आपके स्वयंसेवक घंटे अनुमोदित किए।",
      contributionHeader: "अनुमोदित योगदान:",
      fieldActivity: "भूमिका/गतिविधि",
      fieldDates: "सेवा तिथि",
      fieldHoursApproved: "अनुमोदित घंटे",
      fieldApprovedBy: "द्वारा अनुमोदित",
      fieldVerificationDate: "सत्यापन तिथि",
      verifiedNote: "आपकी सेवा अब आपके सत्यापित स्वयंसेवक रिकॉर्ड पर दिखाई देती है। नियोक्ता, स्कूल और समुदाय इन घंटों पर भरोसा कर सकते हैं क्योंकि ये आपके द्वारा सेवित संगठन द्वारा पुष्टि की गई हैं — स्व-रिपोर्ट नहीं।",
      ctaText: "अपना स्वयंसेवक रिकॉर्ड देखें →",
      closing: "दिखाने के लिए धन्यवाद। यह वह काम है जो दुनिया को आगे ले जाता है।",
    },
    volunteerRejection: {
      subject: "आपके स्वयंसेवक घंटे सबमिशन पर अपडेट",
      preheader: "{{charityName}} ने आपके सबमिशन की समीक्षा की — यह परिणाम है।",
      opening: "{{charityName}} ने आपके सबमिट किए गए स्वयंसेवक घंटों की समीक्षा की और इस समय उन्हें अनुमोदित करने में असमर्थ रहा।",
      submissionHeader: "सबमिशन विवरण:",
      fieldActivity: "गतिविधि",
      fieldDates: "तारीख",
      fieldHoursSubmitted: "सबमिट किए गए घंटे",
      reasonHeader: "संगठन का कारण:",
      notAReflection: "यह आपकी सेवा के प्रति प्रतिबद्धता का प्रतिबिंब नहीं है। अक्सर यह एक गायब विवरण, एक गतिविधि जो संगठन के ट्रैकिंग दायरे से बाहर है, या एक तारीख जिसे सुधार की आवश्यकता है, का मामला होता है।",
      whatNextHeader: "आगे क्या कर सकते हैं:",
      step1: "सीधे {{charityName}} से संपर्क करें और स्पष्ट करें या सही विवरण के साथ फिर से सबमिट करें।",
      step2: "अपने स्वयंसेवक डैशबोर्ड से किसी भी समय नए घंटे लॉग करें।",
      ctaText: "अपने स्वयंसेवक डैशबोर्ड पर जाएं →",
      closing: "आपके द्वारा दिए गए समय के लिए धन्यवाद। आगे बढ़ते रहें।",
    },
  },
};

/** Return the EmailStrings for the given locale (falls back to "en"). */
export function getEmailStrings(locale: EmailLocale): EmailStrings {
  return STRINGS[locale] ?? STRINGS.en;
}
