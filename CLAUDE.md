# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Expense tracker built on a Salesforce Experience Cloud site (**Build Your Own (LWR)** template). Personal project.

- **Salesforce** is the database (custom objects).
- **Apex** is the only data-access layer between UI and database.
- **LWC** is the frontend. LWR sites are LWC-only: no Aura components, and no standard Aura Builder widgets (record detail/list), so forms and lists are custom LWC.

## Org

Use **only** the `SSO_IDP` org (Developer Edition dedicated to this project; it is the default `target-org` in `.sf/config.json`). The CLI has other authorized orgs (work orgs) — never target them.

## Commands

```bash
npm run lint                 # ESLint (flat config, eslint.config.js)
npm run lint:fix
npm run prettier             # format; respects .prettierignore
npm test                     # all LWC Jest tests (sfdx-lwc-jest)
npx sfdx-lwc-jest -- force-app/main/default/lwc/<component>   # single component
npx sfdx-lwc-jest -- -t "<test name>"                          # single test by name

# Deploy/retrieve by path or metadata — never the whole force-app (see below)
sf project deploy start --source-dir force-app/main/default/lwc/<component>
sf project deploy start --metadata ApexClass:<ClassName>
sf apex run test --class-names <TestClass> --result-format human --synchronous
sf project retrieve start --metadata DigitalExperienceBundle:site/expense_tracker_lwr1
sf community publish --name expense-tracker-lwr   # LWR changes are live only after publish
```

Pre-commit (Husky + lint-staged): Prettier on staged files, ESLint on `lwc/**/*.js`, Jest related tests for changed LWC.

## Repository layout — important

`force-app/main/default` contains a **full baseline retrieve of the org** (~4,300 files: standard objects, profiles, layouts, stock community Apex/Visualforce/Aura login components). It was committed as-is as a snapshot. Consequences:

- Most of `force-app` is not project code. Project-owned metadata is what we add (custom objects, our Apex, `lwc/`, permission sets) plus the LWR site.
- **Never deploy the whole `force-app` directory** — it would overwrite stock profiles/layouts in the org. Deploy by `--source-dir`/`--metadata`.
- `manifest/package.xml` is the CLI-generated full-org manifest.

LWR site metadata (all names differ slightly — use exact ones):

- `networks/expense-tracker-lwr` (Network; status `UnderConstruction`, self-registration off, URL prefix `vforcesite`)
- `sites/expense_tracker_lwr` (CustomSite)
- `digitalExperienceConfigs/expense_tracker_lwr1` + `digitalExperiences/site/expense_tracker_lwr1` (DigitalExperienceBundle: routes, views, theme, branding)
- also `navigationMenus`, `networkBranding`, `audience`, `moderation`, `managedTopics` for this network

LWC components exposed in the site need targets `lightningCommunity__Page` and `lightningCommunity__Default` in `js-meta.xml`.

## Formatting rules

`.prettierignore` deliberately excludes org-generated metadata (`force-app/**/*.xml`, `force-app/**/digitalExperiences/**`, `manifest/`) so files stay byte-identical to `sf project retrieve` output. Do not reformat these or remove the exclusions — it causes formatting-only diffs on every retrieve. Apex and LWC source is stored verbatim by the org, so it is formatted normally (single quotes, 4-space indent, 100 cols).

The 65 stock Apex/Visualforce/Aura files are intentionally left unformatted, so `npm run prettier:verify` reports them; that is expected.

ESLint: Salesforce `recommended` + `i18n` presets with extra LWC/code-quality rules, then `eslint-config-prettier`; `curly` is re-enabled after the Prettier config because that config turns it off.

## Planned architecture (not yet implemented)

Agreed design; do not scaffold until asked.

- **Data model:** `Expense__c` (Amount, Date, Category lookup, Description, Payment Method), `Expense_Category__c`, later `Budget__c`. External OWD Private — users see only their own expenses.
- **Apex layers:** `*Controller` (thin `@AuraEnabled`, `cacheable=true` for reads) → `*Service` (business logic) → `*Selector` (all SOQL, `WITH USER_MODE`) + DTOs. All classes `with sharing`, DML via `AccessLevel.USER_MODE` (site users are external).
- **LWC:** container component owns Apex calls and state; presentational children receive data via `@api` and emit `CustomEvent`; `refreshApex` after writes.
- Permission set for Customer Community users.

## Git

- Remote: `https://ESheuchuk@github.com/ESheuchuk/expense-tracker-lwr.git` (username pinned in URL so the macOS keychain uses the personal account, not the work one).
- Repo-local `user.email` is the personal address; don't change it.
- `git commit` and `git push` require user confirmation (`ask` in `.claude/settings.json`).
