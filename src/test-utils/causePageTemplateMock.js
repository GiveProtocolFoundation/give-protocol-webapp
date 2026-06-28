// Mock for @/components/charity/CausePageTemplate
// Renders cause data for assertion in tests.
export const CausePageTemplate = ({ cause }) => (
  <div data-testid="cause-page-template">
    <h1>{cause.name}</h1>
    <p>{cause.description}</p>
    <span data-testid="category">{cause.category}</span>
    <span data-testid="location">{cause.location}</span>
    <span data-testid="timeline">{cause.timeline}</span>
    <span data-testid="image">{cause.image}</span>
    <span data-testid="status">{cause.status}</span>
    <span data-testid="target">{cause.targetAmount}</span>
    <span data-testid="raised">{cause.raisedAmount}</span>
    <span data-testid="impact-count">{cause.impact?.length ?? 0}</span>
    <span data-testid="partners-count">{cause.partners?.length ?? 0}</span>
  </div>
);
