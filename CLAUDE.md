# CLAUDE.md - Give Protocol Web App

Give Protocol Web App - Progressive Web Application for blockchain-based charitable giving, built with React, TypeScript, and Vite. Part of the Give Protocol distributed repository architecture.

## Repository Structure

This is the **webapp** repository, one of four Give Protocol repositories:

- **give-protocol-webapp** (this repo): React/Vite Progressive Web App
- **give-protocol-contracts**: Solidity smart contracts and Hardhat infrastructure
- **give-protocol-docs**: Jekyll documentation site
- **give-protocol-backend**: Supabase backend and admin functions

## Essential Commands

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run lint         # Run ESLint
npm run build        # Production build (TypeScript + Vite)
npm run test         # Run Jest tests
npm run test:e2e     # Run Cypress end-to-end tests
```

## Architecture

- **Pages**: `/src/pages/` organized by feature (charity/, donor/, volunteer/, admin/)
- **Components**: `/src/components/` with feature-specific subdirectories
- **Hooks**: `/src/hooks/` including web3-specific hooks in `/src/hooks/web3/`
- **Contexts**: React Context for Auth, Web3, Settings, Toast
- **Smart Contracts**: See `give-protocol-contracts` repository

## Internationalization (i18n)

The app uses **i18next** with **react-i18next** supporting 12 languages: en, es, de, fr, ja, zh-CN, zh-TW, th, vi, ko, ar, hi.

### i18n Workflow

When adding or modifying user-facing text:

1. **Add English keys to `src/i18n/resources/en.ts`** — this is the authoritative source
2. **Use `t(key, fallback)` in components** — always include the English fallback text
   ```typescript
   import { useTranslation } from "@/hooks/useTranslation";
   const { t } = useTranslation();
   // CORRECT — key registered in en.ts with fallback
   <h1>{t("settings.title", "Settings")}</h1>
   // WRONG — key without fallback (shows raw key if missing from en.ts)
   <h1>{t("settings.title")}</h1>
   ```
3. **Never add `t()` calls without registering keys in `en.ts`** — CI tests will fail
4. **Regenerate translations** for all 11 non-English languages after adding new English keys

### Key Rules

- Keys use dot notation with scope prefixes: `auth.signin.title`, `admin.dashboard.alerts`, `common.cancel`
- `en.ts` is the master — all other language files must have the same keys
- Language detection: localStorage → browser navigator → English fallback
- Custom hook `useTranslation` from `@/hooks/useTranslation` syncs with SettingsContext

## Environment Setup

`.env` file required:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `VITE_MOONBASE_RPC_URL`

## Code Quality Rules

### DeepSource Violations (CI/CD Failures)

1. **JS-0356: Unused variables** - Prefix with `_` or use the variable

   ```typescript
   // WRONG
   const mockSpy = jest.spyOn(module, "method");

   // CORRECT
   const _mockSpy = jest.spyOn(module, "method");
   // OR use it
   expect(mockSpy).toHaveBeenCalled();
   ```

2. **JS-0323: `any` type** - Create proper TypeScript interfaces

   ```typescript
   // WRONG
   const props: any = { ... };

   // CORRECT
   interface Props { onClose: () => void; children: React.ReactNode; }
   ```

3. **JS-0417: Arrow functions in JSX props** - Creates new function every render

   ```typescript
   // WRONG
   <button onClick={() => handleClick(id)}>Click</button>
   <input onChange={(e) => setValue(e.target.value)} />

   // CORRECT - Always use useCallback
   const handleClick = useCallback((e: React.MouseEvent) => {
     const id = e.currentTarget.dataset.id;
     // handle click
   }, [dependencies]);
   <button data-id={id} onClick={handleClick}>Click</button>
   ```

4. **JS-0415: JSX nesting >4 levels** - Combine CSS classes to flatten

   ```typescript
   // WRONG - 5 levels: table > thead > tr > th > div
   <table><thead><tr><th><div className="flex">Content</div></th></tr></thead></table>

   // CORRECT - Apply classes directly (4 levels)
   <table><thead><tr><th className="flex">Content</th></tr></thead></table>
   ```

5. **JS-0359: `require()` statements** - Use ES6 imports

   ```typescript
   // WRONG
   const module = require("./module");

   // CORRECT
   import * as module from "./module";
   ```

6. **JS-0321: Empty functions** - Add explanatory comments

   ```typescript
   // WRONG
   jest.spyOn(obj, "method").mockImplementation(() => {});

   // CORRECT
   jest.spyOn(obj, "method").mockImplementation(() => {
     // Empty mock to prevent actual execution
   });
   ```

7. **JS-0339: Non-null assertions** - Add explicit checks

   ```typescript
   // WRONG
   const timestamp = block!.timestamp;

   // CORRECT
   if (!block) throw new Error("Could not get latest block");
   const timestamp = block.timestamp;
   ```

8. **JS-0437: Array index as React key** - Use stable IDs

   ```typescript
   // WRONG
   {items.map((item, index) => <Item key={index} />)}

   // CORRECT
   {items.map((item) => <Item key={item.id} />)}
   ```

9. **JS-0246: String concatenation** - Use template literals

   ```typescript
   // WRONG
   url = "/" + url;

   // CORRECT
   url = `/${url}`;
   ```

10. **JS-0066: `!!` type coercion** - Use `Boolean()`

11. **Context Provider values** - Wrap in `useMemo`

    ```typescript
    // WRONG - Creates new object every render
    <MyContext.Provider value={{ foo, bar }}>

    // CORRECT
    const contextValue = React.useMemo(() => ({ foo, bar }), [foo, bar]);
    <MyContext.Provider value={contextValue}>
    ```

12. **Number static methods** - Use `Number.parseFloat()`, `Number.parseInt()`, `Number.isNaN()`

### Security Patterns

**HTML Sanitization (CodeQL js/incomplete-multi-character-sanitization)**

```typescript
// WRONG - Vulnerable to incomplete sanitization
const sanitized = input.replace(/<[^>]*>/g, "");

// CORRECT - Remove individual HTML characters
const sanitized = input.replace(/[<>]/g, "");
```

### Additional Rules

- **JS-0320**: Use destructuring instead of `delete` operator
- **JS-0054**: Wrap switch case bodies in braces for `const`/`let`
- **JS-0327**: Don't use classes as namespaces - use `const` objects
- **JS-C1003**: Avoid wildcard imports except for non-ES modules
- **JS-0357**: Define functions before using them in `useCallback`
- **JS-0099**: No TODO/FIXME/XXX comments in production code
- **JS-0052**: Replace `alert`/`confirm`/`prompt` with custom modals
- **JS-0242**: Always use `const` for never-reassigned variables

### React-Specific Rules

- Always import React when using JSX
- Use `import type` for type-only imports
- Export functions need JSDoc with `@param` and `@returns`
- Use explicit boolean checks in conditional rendering (`value !== undefined` not `value`)

## Pre-Commit Checklist

```bash
npm run lint         # Fix ALL errors
npm test -- --coverage   # Ensure new code has tests
```

## Testing Requirements

SonarCloud requires test coverage on all new code. Without tests, builds will fail.

**Write tests for:**

- New utility functions (`src/utils/`)
- New business logic, validation, formatting/parsing functions
- New services and API integrations

**Test file naming:** Place tests next to the source file: `foo.ts` → `foo.test.ts`

```bash
npm test                              # Run all tests
npm test -- --coverage                # Run with coverage
npm test src/utils/formatters.test.ts # Run specific file
npm test -- --watch                   # Watch mode
```

### Example Test Structure

```typescript
describe("myFunction", () => {
  it("should handle valid input", () => {
    expect(myFunction("valid")).toBe("expected");
  });

  it("should handle edge cases", () => {
    expect(myFunction("")).toBe("default");
    expect(myFunction(null)).toBe("default");
  });

  it("should throw on invalid input", () => {
    expect(() => myFunction("invalid")).toThrow();
  });
});
```

## Behavioral Guidelines

**Think before coding:**

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them.
- If a simpler approach exists, say so.

**Simplicity first:**

- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for impossible scenarios.

**Surgical changes:**

- Don't "improve" adjacent code, comments, or formatting.
- Match existing style.
- Remove only imports/variables that YOUR changes made unused.

**Goal-driven execution:**

- Transform tasks into verifiable goals.
- For multi-step tasks, state a brief plan with verification steps.
