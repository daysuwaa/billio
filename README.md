# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Connect Gmail (finds subscriptions from receipts)
Gmail is read in the browser, on the user's phone. Nothing is uploaded.
1. Google Cloud Console: create a project, enable the Gmail API.
2. OAuth consent screen: External, add the `gmail.readonly` scope, add yourself under Test users.
3. Credentials: create an OAuth client ID (Web application). Add `http://localhost:5173` and your deployed URL under Authorized JavaScript origins.
4. Copy `.env.example` to `.env` and set `VITE_GOOGLE_CLIENT_ID`.
5. Going public: Google classes `gmail.readonly` as a restricted scope. Publishing to everyone needs Google's verification and a security assessment. Test mode allows up to 100 test users with no review.
# billio
