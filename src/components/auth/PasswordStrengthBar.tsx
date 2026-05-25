import React, { useMemo } from "react";

interface PasswordStrengthBarProps {
  password: string;
}

/** Visual password strength indicator with 4 segments and a text label. */
export const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({
  password,
}) => {
  const { score, label } = useMemo(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const labels: Record<number, string> = {
      0: "Weak",
      1: "Weak",
      2: "Fair",
      3: "Good",
      4: "Strong",
    };
    return { score: strength, label: labels[strength] };
  }, [password]);

  if (!password) return null;

  const colors: Record<number, string> = {
    0: "bg-red-500",
    1: "bg-red-500",
    2: "bg-amber-500",
    3: "bg-amber-400",
    4: "bg-green-500",
  };

  const activeColor = colors[score];

  return (
    <div className="space-y-1" data-testid="password-strength-bar">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i < score ? activeColor : "bg-gray-200 dark:bg-gray-600"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-500">{label}</p>
    </div>
  );
};
