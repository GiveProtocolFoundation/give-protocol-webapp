import ts from "typescript";

/** A user-facing string literal found in JSX that bypasses t(). */
export interface HardcodedString {
  line: number;
  text: string;
  kind: "text" | "attribute" | "expression";
}

/** JSX attributes whose string values are shown to (or read out to) users. */
const USER_FACING_ATTRIBUTES = new Set([
  "placeholder",
  "aria-label",
  "aria-description",
  "title",
  "alt",
  "label",
]);

const HAS_WORD = /[A-Za-z]{2,}/;

/**
 * Returns true when the literal's value flows straight into JSX output,
 * e.g. `{"Connect"}` or `{isLoading ? "Connecting..." : "Connect"}`.
 *
 * @param node - A string or template literal node.
 * @returns Whether the node is rendered directly inside a JSX expression.
 */
function rendersInJsx(node: ts.Node): boolean {
  let current: ts.Node = node;
  let parent = current.parent;
  while (parent) {
    if (ts.isJsxExpression(parent)) {
      // Attribute expressions like className={"..."} are not user-facing
      // unless the attribute itself is in the user-facing list.
      if (ts.isJsxAttribute(parent.parent)) {
        return USER_FACING_ATTRIBUTES.has(parent.parent.name.getText());
      }
      return true;
    }
    const passesThrough =
      ts.isParenthesizedExpression(parent) ||
      (ts.isConditionalExpression(parent) && parent.condition !== current) ||
      (ts.isBinaryExpression(parent) &&
        (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
          parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) &&
        parent.right === current);
    if (!passesThrough) return false;
    current = parent;
    parent = current.parent;
  }
  return false;
}

/**
 * Collects the literal text of a template expression, ignoring substitutions.
 *
 * @param node - The template expression.
 * @returns The concatenated literal parts.
 */
function templateLiteralText(node: ts.TemplateExpression): string {
  return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)]
    .join(" ")
    .trim();
}

/**
 * Scans TSX source for user-facing strings that are not passed through t():
 * JSX text nodes, user-facing attributes (placeholder, aria-label, title, alt,
 * label) and string literals rendered directly inside JSX expressions.
 *
 * Strings without at least two consecutive letters (punctuation, numbers,
 * separators like "•") are ignored.
 *
 * @param source - The file contents.
 * @param fileName - File name used for parsing diagnostics.
 * @returns The hardcoded strings found, in source order.
 */
export function findHardcodedStrings(
  source: string,
  fileName = "file.tsx",
): HardcodedString[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: HardcodedString[] = [];

  const record = (node: ts.Node, text: string, kind: HardcodedString["kind"]) => {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (!HAS_WORD.test(trimmed)) return;
    // Point at the first visible character, not leading JSX whitespace.
    const leading = ts.isJsxText(node) ? text.length - text.trimStart().length : 0;
    const { line } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart() + leading,
    );
    found.push({ line: line + 1, text: trimmed, kind });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      record(node, node.text, "text");
    } else if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      USER_FACING_ATTRIBUTES.has(node.name.getText())
    ) {
      record(node, node.initializer.text, "attribute");
    } else if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      rendersInJsx(node)
    ) {
      record(node, node.text, "expression");
    } else if (ts.isTemplateExpression(node) && rendersInJsx(node)) {
      record(node, templateLiteralText(node), "expression");
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}
