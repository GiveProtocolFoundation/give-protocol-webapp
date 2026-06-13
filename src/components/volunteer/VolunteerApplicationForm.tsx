import React, { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/Button";
import { Logger } from "@/utils/logger";
import { encryptVolunteerApplicationPII } from "@/utils/crypto/piiEncryption";
import {
  validateEmail,
  validateName,
  validatePhoneNumber,
} from "@/utils/validation";
import { AlertCircle, X, Mail } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "@/hooks/useTranslation";
import { AGE_AFFIRMATION_COPY } from "@/constants/ageAffirmation";

type CommitmentType = "one-time" | "short-term" | "long-term";

// Sub-component for section headers with numbered badges
interface SectionHeaderProps {
  number: number;
  title: string;
}

/** Numbered section header with gradient badge for form sections. */
const SectionHeader: React.FC<SectionHeaderProps> = ({ number, title }) => (
  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
    <span className="w-7 h-7 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 shadow-md">
      {number}
    </span>{" "}
    {title}
  </h2>
);

// Sub-component for consent checkbox items
interface ConsentCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
  description: string;
  note?: string;
}

/** Checkbox item with title, description, and optional note for consent forms. */
const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  id,
  checked,
  onChange,
  title,
  description,
  note,
}) => (
  <label
    htmlFor={id}
    aria-label={title}
    className="flex items-start hover:bg-white dark:hover:bg-gray-600 rounded-lg p-3 transition-colors cursor-pointer"
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="mt-1 h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
    />
    <div className="ml-3">
      <strong className="font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </strong>
      <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
        {description}
      </p>
      {note && (
        <p className="text-gray-500 dark:text-gray-400 italic text-xs mt-1">
          {note}
        </p>
      )}
    </div>
  </label>
);

// Sub-component for skill tags
interface SkillTagProps {
  skill: string;
  onRemove: (_e: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Removable pill tag displaying a selected skill. */
const SkillTag: React.FC<SkillTagProps> = ({ skill, onRemove }) => (
  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-full mr-2 mb-2 animate-fadeIn">
    <span className="text-sm">{skill}</span>
    <button
      type="button"
      onClick={onRemove}
      className="bg-white/20 hover:bg-white/30 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
      aria-label={`Remove ${skill}`}
    >
      <X className="w-3 h-3" />
    </button>
  </span>
);

// Sub-component for commitment type radio options
interface CommitmentOptionProps {
  id: string;
  value: CommitmentType;
  selectedValue: CommitmentType;
  onChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
  description: string;
}

/** Radio option card for selecting a volunteer commitment level. */
const CommitmentOption: React.FC<CommitmentOptionProps> = ({
  id,
  value,
  selectedValue,
  onChange,
  title,
  description,
}) => (
  <label
    htmlFor={id}
    aria-label={`${title} commitment level`}
    className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
      selectedValue === value
        ? "border-emerald-600 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30"
        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
    }`}
  >
    <input
      id={id}
      type="radio"
      name="commitmentType"
      value={value}
      checked={selectedValue === value}
      onChange={onChange}
      className="sr-only"
    />
    <div className="text-center">
      <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">
        {description}
      </div>
    </div>
  </label>
);

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  className: string;
  placeholder?: string;
  error?: string;
}

/** Labeled input field with validation error display. */
const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required,
  type = "text",
  value,
  onChange,
  className,
  placeholder,
  error,
}) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
    >
      {label} {required && <span className="text-red-500 text-base">*</span>}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      required={required}
    />
    {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
  </div>
);

interface FormSelectFieldProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  className: string;
  children: React.ReactNode;
  error?: string;
  colSpan?: boolean;
}

/** Labeled select field with validation error display. */
const FormSelectField: React.FC<FormSelectFieldProps> = ({
  id,
  label,
  required,
  value,
  onChange,
  className,
  children,
  error,
  colSpan,
}) => (
  <div className={colSpan ? "md:col-span-2" : undefined}>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
    >
      {label} {required && <span className="text-red-500 text-base">*</span>}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className={className}
      required={required}
    >
      {children}
    </select>
    {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
  </div>
);

/** Consent explanation listing the data processing terms volunteers agree to. */
const ConsentExplanation: React.FC = () => (
  <div className="mb-4">
    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
      I understand that:
    </p>
    <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
      <li>
        My personal information will be processed to evaluate my volunteer
        application, manage volunteer assignments, and carry out related
        activities. This processing is necessary to take steps at my request
        before, and to perform, any volunteer arrangement (GDPR Art. 6(1)(b));
        it does not rely on my consent.
      </li>
      <li>
        GIVE PROTOCOL may collect various categories of my personal information,
        including identity information, contact details, background information,
        availability, and references. I should not include special categories of
        data (such as information about health, racial or ethnic origin,
        religious or political beliefs, trade-union membership, or sex life or
        sexual orientation) in free-text fields, as such data is not required to
        evaluate my application.
      </li>
      <li>
        My personal information may be shared with authorized personnel within
        the charity organization offering the volunteer opportunity, service
        providers, and third parties as outlined in the Privacy Notice.
      </li>
      <li>
        Where a service provider is located outside my country of residence, my
        personal information may be transferred internationally under
        appropriate safeguards (such as Standard Contractual Clauses) as
        described in the Privacy Notice. These transfers do not rely on my
        consent.
      </li>
      <li>
        I have certain rights regarding my personal information, which vary
        depending on my location, including the rights to access, rectify,
        delete, restrict processing, data portability, and object to processing.
      </li>
      <li>
        I can object to processing (GDPR Art. 21) and request erasure of my
        personal information (GDPR Art. 17) by contacting{" "}
        <a
          href="mailto:legal@giveprotocol.io"
          className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
        >
          legal@giveprotocol.io <Mail className="w-3 h-3" />
        </a>
        {". "}Where any specific processing is based on my consent, I can
        withdraw that consent at any time without affecting the lawfulness of
        processing carried out before withdrawal. Objecting or requesting
        erasure may impact the organization&apos;s ability to consider my
        volunteer application.
      </li>
    </ol>
  </div>
);

interface ConsentPanelProps {
  formData: FormData;
  onCheckboxChange: (
    _field: keyof FormData,
  ) => (_e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Consent panel with explanation, specific consents, and acknowledgment checkboxes. */
const ConsentPanel: React.FC<ConsentPanelProps> = ({
  formData,
  onCheckboxChange,
}) => {
  const { t } = useTranslation();
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border-l-4 border-emerald-600">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t("volunteer.consentHeader", "Volunteer Application Consent")}
      </h3>

      <div className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          GIVE PROTOCOL processes the personal information in this application
          to evaluate my volunteer application and, if successful, to manage my
          volunteer engagement. This processing is necessary to take steps at my
          request before, and to perform, any volunteer arrangement (GDPR Art.
          6(1)(b)) and does not rely on my consent. Processing is carried out as
          described in the Volunteer Application Privacy Notice, which I should
          read before continuing.
        </p>
      </div>

      <ConsentExplanation />

      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t("volunteer.processingAckTitle", "PROCESSING ACKNOWLEDGMENT")}
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {t(
            "volunteer.processingAckDesc",
            "Please review and acknowledge the following before continuing:",
          )}
        </p>
        <div className="space-y-3">
          <ConsentCheckbox
            id="essential-processing"
            checked={formData.essentialProcessing}
            onChange={onCheckboxChange("essentialProcessing")}
            title={t(
              "volunteer.essentialProcessingTitle",
              "Application Processing (Required to confirm):",
            )}
            description="I understand that GIVE PROTOCOL will process my personal information to evaluate my volunteer application and, if successful, to manage my volunteer engagement. This processing is necessary to act on my application and is carried out under GDPR Art. 6(1)(b) (steps prior to, and performance of, a volunteer arrangement); it is not based on my consent."
            note="Note: This processing is necessary to consider your application. Confirming indicates you have been informed; it is not a consent to processing. International transfers, where applicable, rely on appropriate safeguards described in the Privacy Notice, not on this confirmation."
          />
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t("volunteer.acknowledgmentTitle", "ACKNOWLEDGMENT")}
        </p>
        <ConsentCheckbox
          id="age-confirmation"
          checked={formData.ageConfirmation}
          onChange={onCheckboxChange("ageConfirmation")}
          title={t("volunteer.ageConfirmationTitle", "Age Confirmation:")}
          description={AGE_AFFIRMATION_COPY.positive}
        />
        <ConsentCheckbox
          id="privacy-notice"
          checked={formData.privacyNotice}
          onChange={onCheckboxChange("privacyNotice")}
          title={t("volunteer.privacyNoticeTitle", "Privacy Notice:")}
          description="I confirm that I have read and understood the Privacy Notice."
        />
      </div>
    </div>
  );
};

/** Personal information form section with name, email, phone, location, timezone, and age range fields. */
const PersonalInfoSection: React.FC<{
  formData: FormData;
  validationErrors: Record<string, string>;
  handleFieldChange: (
    _field: keyof FormData,
  ) => (
    _e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  inputClasses: string;
  selectClasses: string;
}> = ({
  formData,
  validationErrors,
  handleFieldChange,
  inputClasses,
  selectClasses,
}) => {
  const { t } = useTranslation();
  return (
    <section className="mb-8">
      <SectionHeader
        number={1}
        title={t("volunteer.personalInfo", "Personal Information")}
      />
      <div className="grid md:grid-cols-2 gap-x-4 gap-y-6">
        <FormField
          id="firstName"
          label={t("volunteer.firstName", "First Name")}
          required
          value={formData.firstName}
          onChange={handleFieldChange("firstName")}
          className={inputClasses}
          error={validationErrors.firstName}
        />
        <FormField
          id="lastName"
          label={t("volunteer.lastName", "Last Name")}
          required
          value={formData.lastName}
          onChange={handleFieldChange("lastName")}
          className={inputClasses}
          error={validationErrors.lastName}
        />
        <FormField
          id="email"
          label={t("volunteer.emailAddress", "Email Address")}
          required
          type="email"
          value={formData.email}
          onChange={handleFieldChange("email")}
          className={inputClasses}
          error={validationErrors.email}
        />
        <FormField
          id="phoneNumber"
          label={t("volunteer.phoneNumber", "Phone Number")}
          type="tel"
          value={formData.phoneNumber}
          onChange={handleFieldChange("phoneNumber")}
          className={inputClasses}
          error={validationErrors.phoneNumber}
        />
        <FormField
          id="location"
          label={t("volunteer.locationCity", "Location/City")}
          value={formData.location}
          onChange={handleFieldChange("location")}
          className={inputClasses}
          placeholder={t(
            "volunteer.locationCityPlaceholder",
            "e.g., San Francisco, CA",
          )}
        />
        <FormSelectField
          id="timezone"
          label={t("volunteer.timeZone", "Time Zone")}
          value={formData.timezone}
          onChange={handleFieldChange("timezone")}
          className={selectClasses}
        >
          <option value="">
            {t("volunteer.selectTimeZone", "Select Time Zone")}
          </option>
          <option value="UTC-12">UTC-12 (Baker Island)</option>
          <option value="UTC-11">UTC-11 (Hawaii-Aleutian)</option>
          <option value="UTC-10">UTC-10 (Hawaii)</option>
          <option value="UTC-9">UTC-9 (Alaska)</option>
          <option value="UTC-8">UTC-8 (Pacific Time)</option>
          <option value="UTC-7">UTC-7 (Mountain Time)</option>
          <option value="UTC-6">UTC-6 (Central Time)</option>
          <option value="UTC-5">UTC-5 (Eastern Time)</option>
          <option value="UTC-4">UTC-4 (Atlantic Time)</option>
          <option value="UTC-3">UTC-3 (Argentina, Brazil)</option>
          <option value="UTC-2">UTC-2 (South Georgia)</option>
          <option value="UTC-1">UTC-1 (Azores)</option>
          <option value="UTC+0">UTC+0 (GMT/London)</option>
          <option value="UTC+1">UTC+1 (Central Europe)</option>
          <option value="UTC+2">UTC+2 (Eastern Europe)</option>
          <option value="UTC+3">UTC+3 (Moscow, East Africa)</option>
          <option value="UTC+4">UTC+4 (Gulf States)</option>
          <option value="UTC+5">UTC+5 (Pakistan)</option>
          <option value="UTC+5.5">UTC+5:30 (India)</option>
          <option value="UTC+6">UTC+6 (Bangladesh)</option>
          <option value="UTC+7">UTC+7 (Southeast Asia)</option>
          <option value="UTC+8">UTC+8 (China, Singapore)</option>
          <option value="UTC+9">UTC+9 (Japan, Korea)</option>
          <option value="UTC+9.5">UTC+9:30 (Central Australia)</option>
          <option value="UTC+10">UTC+10 (Eastern Australia)</option>
          <option value="UTC+11">UTC+11 (Solomon Islands)</option>
          <option value="UTC+12">UTC+12 (New Zealand)</option>
          <option value="UTC+13">UTC+13 (Tonga)</option>
          <option value="UTC+14">UTC+14 (Line Islands)</option>
        </FormSelectField>
        <FormSelectField
          id="ageRange"
          label={t("volunteer.ageRange", "Age Range")}
          required
          value={formData.ageRange}
          onChange={handleFieldChange("ageRange")}
          className={selectClasses}
          error={validationErrors.ageRange}
          colSpan
        >
          <option value="">
            {t("volunteer.selectAgeRange", "Select Age Range")}
          </option>
          <option value="under-18">Under 18</option>
          <option value="18-24">18-24</option>
          <option value="25-34">25-34</option>
          <option value="35-44">35-44</option>
          <option value="45-54">45-54</option>
          <option value="55-64">55-64</option>
          <option value="65+">65+</option>
        </FormSelectField>
      </div>
    </section>
  );
};

/** Tag-style skill input field with removable skill pills. */
const SkillInputField: React.FC<{
  skills: string[];
  createRemoveSkillHandler: (
    _index: number,
  ) => (_e: React.MouseEvent<HTMLButtonElement>) => void;
  currentSkillInput: string;
  handleSkillInputChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSkillInputKeyDown: (_e: React.KeyboardEvent<HTMLInputElement>) => void;
  showSkillPlaceholder: boolean;
  tagInputRef: React.RefObject<HTMLInputElement>;
  error?: string;
}> = ({
  skills,
  createRemoveSkillHandler,
  currentSkillInput,
  handleSkillInputChange,
  handleSkillInputKeyDown,
  showSkillPlaceholder,
  tagInputRef,
  error,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4">
      <label
        htmlFor="skillInput"
        className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
      >
        {t("volunteer.skillsLabel", "Skills and Areas of Interest")}{" "}
        <span className="text-red-500 text-base">*</span>
      </label>
      <div className="relative border-2 border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gray-50 dark:bg-gray-700 transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-3 focus-within:ring-emerald-600/10 w-full min-h-[100px]">
        {skills.map((skill, index) => (
          <SkillTag
            key={skill}
            skill={skill}
            onRemove={createRemoveSkillHandler(index)}
          />
        ))}
        <input
          id="skillInput"
          ref={tagInputRef}
          type="text"
          value={currentSkillInput}
          onChange={handleSkillInputChange}
          onKeyDown={handleSkillInputKeyDown}
          className="w-full bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 pt-6"
          placeholder={
            showSkillPlaceholder
              ? t(
                  "volunteer.skillPlaceholderFull",
                  "Start typing your skills (e.g., Python programming, Public speaking, Grant writing)",
                )
              : t(
                  "volunteer.skillPlaceholderShort",
                  "Type a skill and press Enter...",
                )
          }
        />
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
};

/** Skills, commitment level, and experience section of the application form. */
const SkillsAndInterestsSection: React.FC<{
  formData: FormData;
  validationErrors: Record<string, string>;
  handleFieldChange: (
    _field: keyof FormData,
  ) => (
    _e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  handleSkillInputChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSkillInputKeyDown: (_e: React.KeyboardEvent<HTMLInputElement>) => void;
  createRemoveSkillHandler: (
    _index: number,
  ) => (_e: React.MouseEvent<HTMLButtonElement>) => void;
  currentSkillInput: string;
  showSkillPlaceholder: boolean;
  tagInputRef: React.RefObject<HTMLInputElement>;
  textareaClasses: string;
}> = ({
  formData,
  validationErrors,
  handleFieldChange,
  handleSkillInputChange,
  handleSkillInputKeyDown,
  createRemoveSkillHandler,
  currentSkillInput,
  showSkillPlaceholder,
  tagInputRef,
  textareaClasses,
}) => {
  const { t } = useTranslation();
  return (
    <section className="mb-8 mt-8">
      <SectionHeader
        number={2}
        title={t("volunteer.skillsAndInterests", "Skills & Interests")}
      />

      <SkillInputField
        skills={formData.skills}
        createRemoveSkillHandler={createRemoveSkillHandler}
        currentSkillInput={currentSkillInput}
        handleSkillInputChange={handleSkillInputChange}
        handleSkillInputKeyDown={handleSkillInputKeyDown}
        showSkillPlaceholder={showSkillPlaceholder}
        tagInputRef={tagInputRef}
        error={validationErrors.skills}
      />

      <fieldset className="mb-4">
        <legend className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          {t("volunteer.commitmentLevel", "Commitment Level")}{" "}
          <span className="text-red-500 text-base">*</span>
        </legend>
        <div className="grid md:grid-cols-3 gap-3">
          <CommitmentOption
            id="commitment-one-time"
            value="one-time"
            selectedValue={formData.commitmentType}
            onChange={handleFieldChange("commitmentType")}
            title={t("volunteer.commitment.oneTime", "One-time")}
            description={t(
              "volunteer.commitmentOneTimeDesc",
              "Single project or short-duration tasks",
            )}
          />
          <CommitmentOption
            id="commitment-short-term"
            value="short-term"
            selectedValue={formData.commitmentType}
            onChange={handleFieldChange("commitmentType")}
            title={t("volunteer.commitment.shortTerm", "Short-Term")}
            description={t(
              "volunteer.commitmentShortTermDesc",
              "Few weeks to a few months",
            )}
          />
          <CommitmentOption
            id="commitment-long-term"
            value="long-term"
            selectedValue={formData.commitmentType}
            onChange={handleFieldChange("commitmentType")}
            title={t("volunteer.commitment.longTerm", "Long-Term")}
            description={t(
              "volunteer.commitmentLongTermDesc",
              "Ongoing commitment of several months or more",
            )}
          />
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="experience"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          {t(
            "volunteer.experienceLabel",
            "Tell us about your relevant experience",
          )}{" "}
          <span className="text-red-500 text-base">*</span>
        </label>
        <textarea
          id="experience"
          value={formData.experience}
          onChange={handleFieldChange("experience")}
          className={textareaClasses}
          placeholder={t(
            "volunteer.experiencePlaceholder",
            "Describe your background, skills, and what motivates you to volunteer with Give Protocol...",
          )}
          required
        />
        {validationErrors.experience && (
          <p className="text-sm text-red-600 mt-1">
            {validationErrors.experience}
          </p>
        )}
      </div>
    </section>
  );
};

/** Consent & Agreement section with consent panel and validation error. */
const ConsentAndAgreementSection: React.FC<{
  formData: FormData;
  validationErrors: Record<string, string>;
  handleCheckboxChange: (
    _field: keyof FormData,
  ) => (_e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ formData, validationErrors, handleCheckboxChange }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-8 mt-8">
      <SectionHeader
        number={3}
        title={t("volunteer.consentTitle", "Consent & Agreement")}
      />
      <ConsentPanel
        formData={formData}
        onCheckboxChange={handleCheckboxChange}
      />
      {validationErrors.consent && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start"
        >
          <AlertCircle
            className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-red-700 dark:text-red-300">
            {validationErrors.consent}
          </p>
        </div>
      )}
    </section>
  );
};

/** Submit button and disclaimer footer for the application form. */
const FormFooter: React.FC<{ loading: boolean }> = ({ loading }) => {
  const { t } = useTranslation();
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8 pb-4">
      <Button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-full transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
      >
        {loading
          ? t("volunteer.submitting", "Submitting...")
          : t("volunteer.submitApplication", "Submit Volunteer Application")}
      </Button>
      <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        By submitting this application, you acknowledge that you have read and
        understood Give Protocol&apos;s privacy policy and volunteer guidelines.
        Your data will be processed in accordance with applicable data
        protection regulations.
      </p>
    </div>
  );
};

interface ApplicationDialogProps {
  handleSubmit: (_e: React.FormEvent) => void;
  formData: FormData;
  validationErrors: Record<string, string>;
  handleFieldChange: (
    _field: keyof FormData,
  ) => (
    _e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  handleCheckboxChange: (
    _field: keyof FormData,
  ) => (_e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSkillInputChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSkillInputKeyDown: (_e: React.KeyboardEvent<HTMLInputElement>) => void;
  createRemoveSkillHandler: (
    _index: number,
  ) => (_e: React.MouseEvent<HTMLButtonElement>) => void;
  currentSkillInput: string;
  showSkillPlaceholder: boolean;
  tagInputRef: React.RefObject<HTMLInputElement>;
  inputClasses: string;
  textareaClasses: string;
  selectClasses: string;
  loading: boolean;
}

/** Dialog containing the volunteer application form with personal info, skills, and consent sections. */
const ApplicationDialog: React.FC<ApplicationDialogProps> = ({
  handleSubmit,
  formData,
  validationErrors,
  handleFieldChange,
  handleCheckboxChange,
  handleSkillInputChange,
  handleSkillInputKeyDown,
  createRemoveSkillHandler,
  currentSkillInput,
  showSkillPlaceholder,
  tagInputRef,
  inputClasses,
  textareaClasses,
  selectClasses,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <dialog
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-[95%] max-h-[90dvh] overflow-hidden z-50 p-0 m-0 transition-all duration-300 ease-out animate-in fade-in zoom-in-95"
      style={{ boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)" }}
      open
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <header className="bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white p-8 text-center rounded-t-2xl relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"
          aria-hidden="true"
        />
        <h1 id="modal-title" className="relative z-10 text-3xl font-light mb-2">
          {t("volunteer.applicationTitle", "Volunteer Opportunity Application")}
        </h1>
        <p className="relative z-10 text-lg opacity-90 pb-2">
          {t(
            "volunteer.applicationSubtitle",
            "Help create sustainable impact through verified contributions",
          )}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-200px)]"
      >
        {/* Personal Information Section */}
        <PersonalInfoSection
          formData={formData}
          validationErrors={validationErrors}
          handleFieldChange={handleFieldChange}
          inputClasses={inputClasses}
          selectClasses={selectClasses}
        />

        {/* Skills & Interests Section */}
        <SkillsAndInterestsSection
          formData={formData}
          validationErrors={validationErrors}
          handleFieldChange={handleFieldChange}
          handleSkillInputChange={handleSkillInputChange}
          handleSkillInputKeyDown={handleSkillInputKeyDown}
          createRemoveSkillHandler={createRemoveSkillHandler}
          currentSkillInput={currentSkillInput}
          showSkillPlaceholder={showSkillPlaceholder}
          tagInputRef={tagInputRef}
          textareaClasses={textareaClasses}
        />

        <ConsentAndAgreementSection
          formData={formData}
          validationErrors={validationErrors}
          handleCheckboxChange={handleCheckboxChange}
        />
        <FormFooter loading={loading} />
      </form>
    </dialog>
  );
};

interface VolunteerApplicationFormProps {
  opportunityId: string;
  opportunityTitle: string;
  charityId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type AgeRange =
  | "under-18"
  | "18-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55-64"
  | "65+";

interface FormData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: string;
  timezone: string;
  ageRange: AgeRange | "";

  // Skills & Experience
  skills: string[];
  commitmentType: CommitmentType;
  experience: string;

  // Consent
  essentialProcessing: boolean;
  internationalTransfers: boolean;
  ageConfirmation: boolean;
  privacyNotice: boolean;
}

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  location: "",
  timezone: "",
  ageRange: "",
  skills: [],
  commitmentType: "one-time",
  experience: "",
  essentialProcessing: false,
  internationalTransfers: false,
  ageConfirmation: false,
  privacyNotice: false,
};

/** Modal form for submitting volunteer applications to charity opportunities. */
export const VolunteerApplicationForm: React.FC<
  VolunteerApplicationFormProps
> = ({
  opportunityId,
  opportunityTitle: _opportunityTitle,
  charityId,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { showToast } = useToast();
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);
  const [currentSkillInput, setCurrentSkillInput] = useState("");
  const [showSkillPlaceholder, setShowSkillPlaceholder] = useState(true);
  const { t } = useTranslation();

  // Initialize form with user profile data
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        email: profile.email || "",
        phoneNumber: profile.phone_number || "",
      }));
    }
  }, [profile]);

  // Update placeholder visibility
  useEffect(() => {
    setShowSkillPlaceholder(
      formData.skills.length === 0 && currentSkillInput.length === 0,
    );
  }, [formData.skills.length, currentSkillInput.length]);

  // Form field handlers
  const handleFieldChange = useCallback(
    (field: keyof FormData) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));

        // Clear validation error for the field
        if (validationErrors[field]) {
          setValidationErrors((prev) => {
            const newErrors = { ...prev };
            // Delete the error property
            const { [field]: _, ...rest } = newErrors;
            return rest;
          });
        }
      },
    [validationErrors],
  );

  const handleCheckboxChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.checked }));

      // Clear consent validation errors
      if (validationErrors.consent) {
        setValidationErrors((prev) => {
          const { consent: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [validationErrors],
  );

  // Skill tag handlers
  const handleSkillInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentSkillInput(e.target.value);
    },
    [],
  );

  const addSkill = useCallback(
    (skillText: string) => {
      const trimmed = skillText.trim();
      if (trimmed && !formData.skills.includes(trimmed)) {
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, trimmed],
        }));
        setCurrentSkillInput("");

        // Clear skills validation error
        if (validationErrors.skills) {
          setValidationErrors((prev) => {
            const { skills: _, ...rest } = prev;
            return rest;
          });
        }
      }
    },
    [formData.skills, validationErrors],
  );

  const removeSkill = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  }, []);

  const createRemoveSkillHandler = useCallback(
    (index: number) => {
      return (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        removeSkill(index);
      };
    },
    [removeSkill],
  );

  const handleSkillInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addSkill(currentSkillInput);
      } else if (
        e.key === "Backspace" &&
        currentSkillInput === "" &&
        formData.skills.length > 0
      ) {
        removeSkill(formData.skills.length - 1);
      }
    },
    [currentSkillInput, formData.skills.length, addSkill, removeSkill],
  );

  // Validation
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!validateName(formData.firstName)) {
      errors.firstName = t(
        "volunteer.validation.firstNameInvalid",
        "Please enter a valid first name",
      );
    }
    if (!validateName(formData.lastName)) {
      errors.lastName = t(
        "volunteer.validation.lastNameInvalid",
        "Please enter a valid last name",
      );
    }
    if (!validateEmail(formData.email)) {
      errors.email = t(
        "volunteer.validation.emailInvalid",
        "Please enter a valid email address",
      );
    }
    if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
      errors.phoneNumber = t(
        "volunteer.validation.phoneInvalid",
        "Please enter a valid phone number",
      );
    }
    if (!formData.experience.trim()) {
      errors.experience = t(
        "volunteer.validation.experienceRequired",
        "Please describe your relevant experience",
      );
    }
    if (formData.skills.length === 0) {
      errors.skills = t(
        "volunteer.validation.addSkill",
        "Please add at least one skill",
      );
    }
    if (!formData.ageRange) {
      errors.ageRange = t(
        "volunteer.validation.ageRangeRequired",
        "Please select your age range",
      );
    }

    // Consent validation
    if (
      !formData.essentialProcessing ||
      !formData.ageConfirmation ||
      !formData.privacyNotice
    ) {
      errors.consent = t(
        "volunteer.validation.consentRequired",
        "You must agree to all required consent items",
      );
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, t]);

  // Form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      if (!user || !profile) {
        showToast(
          "error",
          t(
            "volunteer.signInToSubmit",
            "Please log in to submit an application",
          ),
        );
        return;
      }

      setLoading(true);
      try {
        const fullName = `${formData.firstName} ${formData.lastName}`;
        // GIV-409: populate encrypted shadow columns alongside plaintext.
        // Plaintext full_name + email RETAINED (NOT NULL columns + CharityPortal.tsx:847 reads full_name).
        // Plaintext phone_number DROPPED (nullable, no audited reader).
        // Plaintext retire planned as GIV-59 step 2 follow-up once readers consume encrypted columns.
        const encryptedPII = await encryptVolunteerApplicationPII({
          fullName,
          email: formData.email,
          phone: formData.phoneNumber || undefined,
        });

        const { error } = await supabase.from("volunteer_applications").insert({
          opportunity_id: opportunityId,
          applicant_id: user.id,
          charity_id: charityId,
          full_name: fullName,
          email: formData.email,
          ...encryptedPII,
          location: formData.location || null,
          timezone: formData.timezone || null,
          age_range: formData.ageRange || null,
          commitment_type: formData.commitmentType,
          experience: formData.experience,
          skills: formData.skills,
          interests: [],
          certifications: [],
          availability: {
            days: [],
            times: [],
          },
          // GIV-382: column retains its legacy name but now records the
          // Art. 6(1)(b) processing acknowledgment, not consent-as-legal-basis.
          consent_given: formData.essentialProcessing,
          // No longer collected as a transfer mechanism; transfers rely on
          // Art. 46 safeguards (SCCs) disclosed in the Privacy Notice.
          international_transfers_consent: formData.internationalTransfers,
          age_confirmation: formData.ageConfirmation,
          privacy_notice_acknowledged: formData.privacyNotice,
          consent_given_at: new Date().toISOString(),
          consent_version: "v2",
        });

        if (error) throw error;

        Logger.info("Volunteer application submitted", {
          opportunityId,
          userId: user.id,
        });

        showToast(
          "success",
          t(
            "volunteer.applicationSuccess",
            "Application submitted successfully!",
          ),
        );
        onSuccess?.();
        onClose();
      } catch (error) {
        Logger.error("Failed to submit volunteer application", error);
        showToast(
          "error",
          t(
            "volunteer.submitFailed",
            "Failed to submit application. Please try again.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [
      formData,
      validateForm,
      user,
      profile,
      opportunityId,
      charityId,
      showToast,
      onSuccess,
      onClose,
      t,
    ],
  );

  const handleBackdropClick = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  const handleBackdropKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    },
    [loading, onClose],
  );

  const inputClasses =
    "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 focus:outline-none hover:border-gray-400 dark:hover:border-gray-500 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 transition-all duration-200";
  const textareaClasses =
    "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 focus:outline-none hover:border-gray-400 dark:hover:border-gray-500 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 transition-all duration-200 resize-vertical min-h-[100px]";
  const selectClasses =
    "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 focus:outline-none hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-gray-100 transition-all duration-200 cursor-pointer";

  return (
    <>
      <button
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 w-full h-full border-0 p-0 m-0 cursor-default transition-opacity duration-200"
        onClick={handleBackdropClick}
        onKeyDown={handleBackdropKeyDown}
        aria-label="Close modal"
        type="button"
      />
      <ApplicationDialog
        handleSubmit={handleSubmit}
        formData={formData}
        validationErrors={validationErrors}
        handleFieldChange={handleFieldChange}
        handleCheckboxChange={handleCheckboxChange}
        handleSkillInputChange={handleSkillInputChange}
        handleSkillInputKeyDown={handleSkillInputKeyDown}
        createRemoveSkillHandler={createRemoveSkillHandler}
        currentSkillInput={currentSkillInput}
        showSkillPlaceholder={showSkillPlaceholder}
        tagInputRef={tagInputRef}
        inputClasses={inputClasses}
        textareaClasses={textareaClasses}
        selectClasses={selectClasses}
        loading={loading}
      />
    </>
  );
};
