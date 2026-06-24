# Contributing

Contributions are welcome. Keep changes focused, include tests for behavior changes, and update the changelog when the change affects users.

## Recommended Setup

Use [Visual Studio Code](https://code.visualstudio.com/) with the [Vue - Official extension](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

Use Node.js 22.12.0 or newer in the same major line. GitHub Actions currently runs Node.js 22.12.0.

Install dependencies:

```sh
npm install
```

If Playwright browsers are missing locally, install them:

```sh
npx playwright install
```

## Development

Start the local dev server:

```sh
npm run dev
```

Run a production build:

```sh
npm run build
```

The GitHub Pages production build uses the repository base path configured in `vite.config.ts`.

## Tests

Run the full validation suite before opening a pull request:

```sh
npm test
```

Useful targeted commands:

```sh
npm run typecheck
npm run test:unit
npm run test:e2e
npm run test:visual
```

Update visual snapshots only when the visual change is intentional:

```sh
npm run test:visual:update
```

Do not commit generated Playwright output such as `test-results/`.

## Changelog

Update `CHANGELOG.md` for user-facing changes, bug fixes, dependency upgrades, and notable internal testing/build changes. Use the existing version section unless you are preparing a new release.

Keep changelog text user-facing when possible. Put build, dependency, and test-only work under the internal runtime section.

## Pull Requests

Before opening a pull request:

- Keep unrelated refactors out of the change.
- Add or update tests for changed behavior.
- Run `npm test` and `npm run build`.
- Include screenshots only when they help explain a UI change.
- Reference related GitHub issues in the changelog or pull request body when applicable.