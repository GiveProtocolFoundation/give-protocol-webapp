// Mock for @/components/ui/Card
// eslint-disable-next-line no-unused-vars
export const Card = ({ children, className, hover, ...props }) => (
  <div className={className} data-testid="card" {...props}>
    {children}
  </div>
);
