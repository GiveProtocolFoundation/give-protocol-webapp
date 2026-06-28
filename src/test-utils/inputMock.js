// Mock for @/components/ui/Input
// Renders label + input + optional error span with proper htmlFor/id association.
// Mirrors the real Input component's label↔input association so getByLabelText works.

let _inputCounter = 0;

export const Input = ({ label, error, id, ...props }) => {
  // Generate a stable ID when none is provided, so htmlFor links to the input.
  // This mirrors the real component's useId() behaviour.
  const inputId =
    id ||
    `input-mock-${label ? label.toLowerCase().replaceAll(/\s+/g, "-") : ++_inputCounter}`;
  return (
    <div>
      {label && <label htmlFor={inputId}>{label}</label>}
      <input id={inputId} {...props} />
      {error && <span role="alert">{error}</span>}
    </div>
  );
};
