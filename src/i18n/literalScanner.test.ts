import { findHardcodedStrings } from "./literalScanner";

const texts = (src: string) => findHardcodedStrings(src).map((f) => f.text);

describe("findHardcodedStrings", () => {
  it("flags JSX text nodes", () => {
    expect(texts(`const A = () => <p>No results found</p>;`)).toEqual([
      "No results found",
    ]);
  });

  it("flags user-facing attributes but not className", () => {
    const src = `const A = () => (
      <input className="w-full px-3" placeholder="Search..." aria-label="Search box" />
    );`;
    expect(texts(src)).toEqual(["Search...", "Search box"]);
  });

  it("flags string literals rendered through ternaries and fallbacks", () => {
    const src = `const A = ({ busy, err }) => (
      <span>{busy ? "Connecting..." : "Connect"}{err || "Connection Error"}</span>
    );`;
    expect(texts(src)).toEqual([
      "Connecting...",
      "Connect",
      "Connection Error",
    ]);
  });

  it("flags the literal parts of template expressions in JSX", () => {
    const src = "const A = ({ h }) => <span>{`${h} hrs`}</span>;";
    expect(texts(src)).toEqual(["hrs"]);
  });

  it("ignores t() calls, punctuation and ternary conditions", () => {
    const src = `const A = ({ t, mode }) => (
      <p className={mode === "hours" ? "a" : "b"}>
        {t("tracker.title", "Global Impact Rankings")} • {"$0"}
        {mode === "hours" ? t("a.b", "Hours") : null}
      </p>
    );`;
    expect(texts(src)).toEqual([]);
  });

  it("reports the 1-based line where the visible text starts", () => {
    const src = `const A = () => (\n  <div>\n    Hello there\n  </div>\n);`;
    expect(findHardcodedStrings(src)[0]).toMatchObject({
      line: 3,
      kind: "text",
    });
  });
});
