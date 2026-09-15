// Mock for @/components/ui/FormInput
// Renders a plain input with placeholder for testing.
export const FormInput = ({ icon: _icon, rightElement: _rightElement, ...props }) => (
  <div>
    <input {...props} />
    {_rightElement}
  </div>
);
