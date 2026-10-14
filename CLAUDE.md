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

## Workflow

- One feature = one branch `feature/<kebab-name>`; never develop on `main`.
- Each feature has its own plan in `.claude/.plans/<feature>.md` (with a progress checklist). Manual org steps for the user always come **first** in the plan. Ideas deferred for later go to `.claude/.plans/backlog.md`. Only cross-cutting rules live in this file.
- Deploy by path/metadata to `SSO_IDP` only (see Commands).
- Commit only when the user explicitly asks — after they have tested the feature and reviewed the code.

## Frontend rules (all LWC)

- The site is a SPA on native LWR routes. In-site navigation only via `NavigationMixin`; `window.location` is allowed only for auth redirects (a full reload is required to establish the session) and logout.
- **`@wire` is forbidden** (including LDS adapters) — use imperative Apex calls only. Enforced by ESLint (`no-restricted-syntax`).
- Container/presentational split: the container owns Apex calls and state; children get data via `@api` and emit `CustomEvent`.
- Responsive, mobile-first layout (SLDS grid + responsive classes, breakpoints 48em/64em; check 320/768/1024+).
- The LWC compiler drops whitespace between `{expression}` and an element, so never rely on spaces in markup for layout — wrap text in elements and use CSS `gap`/margins.
- Links get real `href`s via `NavigationMixin.GenerateUrl`; the click handler calls `Navigate` only for a plain left click (modified clicks open new tabs).
- The site runs **synthetic shadow** (`DISABLE_SYNTHETIC_SHADOW: false` in the page bootstrap), so global SLDS classes apply inside our templates. When a base component can't do something (e.g. an icon inside an input), build it from SLDS blueprint markup so it looks identical (see `c/passwordInput`).
- Colors come from the theme's styling hooks (`--dxp-g-*`, `--dxp-s-*`) with a fallback, never hard-coded.
- All user-facing text comes from Custom Labels (`@salesforce/label/c.*`), UI language is English.
- Guest check via `@salesforce/user/isGuest`.

## Logging rules

- **LWC:** log only through `c/logger` (the only module allowed to use `console`). Behavior is driven by `Logger_Setting__mdt.Default` (`Console_Enabled__c`, `Console_Log_Level__c`), loaded via an imperative Apex call. LWC errors go to the browser console only.
- **Apex:** log only through `Logger` → `Log_Event__e` (Publish Immediately, survives rollback and works for guest) → `LogEventTrigger` → `Error_Log__c`. Thresholds from `Logger_Setting__mdt`.
- Controller catch pattern: `Logger.error(source, e); Logger.flush(); throw new AuraHandledException(<custom label>)` — never expose internals to the UI.

## Apex/security rules

- Apex DTOs used as `@AuraEnabled` parameters must declare properties with `{ get; set; }` — the Aura deserializer leaves plain public fields null. Apex unit tests that build DTOs directly cannot catch this.
- Self-registration runs as the guest user: never set `User.ProfileId` (not writeable for guest — `Field is not writeable`). The profile comes from the Network's self-registration profile.
- Compare secrets/case-sensitive strings with `.equals()`: Apex `==`/`!=` on strings is case-insensitive.
- `SYSTEM_MODE`/`without sharing` only with a justification comment (e.g. guest registration).
- Authenticated users and admins get access via permission sets (`Expense_Tracker_Member`, `Expense_Tracker_Admin`). Guest (anonymous visitor) access — Apex classes and `Log_Event__e` create — is granted on the site guest profile `expense-tracker-lwr Profile`, which Salesforce created together with the site (it is in the baseline); a permission set with the Guest User License failed to deploy ("This object cannot be edited"). Stock profiles are not modified. Self-registered users get the `Expense Community User` profile (clone of Customer Community User).
- Platform statics (`Site.*`) are wrapped in a gateway class so tests can stub them.
- Validate `startUrl` (relative paths only) to prevent open redirect. Apex coverage target ≥ 90%.

## Site

The LWR site is served from the domain root (no URL prefix): public landing `/`, `/login`, `/SelfRegister`, `/ForgotPassword`, and authenticated `/welcome` (route `Welcome__c`, `RequiresLogin`). Site auth type is `AUTHENTICATED_WITH_PUBLIC_ACCESS_ENABLED`; page access is set per route. Network is `Live`, self-registration is on with profile `Expense Community User`.

Site emails use project templates in `email/ExpenseTracker` (welcome, forgot password) — never show the technical username in them. Usernames are `email + Auth_Setting__mdt.Username_Suffix__c`; every auth form takes the email and builds the username in Apex (stock `community_login:*` components ask for the raw username and must not be used).

LWC names must not collide with stock Aura bundles (`loginForm`, `selfRegister`, `forgotPassword`, ...) — hence `authLoginForm`/`authRegisterForm`. The org's `retrieve` lowercases profile names in `Network` metadata; keep the committed, properly-cased version.

## Architecture

Implemented: auth (`AuthController` → `AuthService` → `SiteGateway`), logging (`Logger`, `Log_Event__e`, `Error_Log__c`, `c/logger`), landing/login/register/welcome pages. Not yet implemented (do not scaffold until asked): the expense data model and the layers below.

- **Data model:** `Expense__c` (Amount, Date, Category lookup, Description, Payment Method), `Expense_Category__c`, later `Budget__c`. External OWD Private — users see only their own expenses.
- **Apex layers:** `*Controller` (thin `@AuraEnabled`, `cacheable=true` for reads) → `*Service` (business logic) → `*Selector` (all SOQL, `WITH USER_MODE`) + DTOs. All classes `with sharing`, DML via `AccessLevel.USER_MODE` (site users are external).
- **LWC:** container component owns Apex calls and state; presentational children receive data via `@api` and emit `CustomEvent`; `refreshApex` after writes.
- Permission set for Customer Community users.

## Git

- Remote: `https://ESheuchuk@github.com/ESheuchuk/expense-tracker-lwr.git` (username pinned in URL so the macOS keychain uses the personal account, not the work one).
- Repo-local `user.email` is the personal address; don't change it.
- `git commit` and `git push` require user confirmation (`ask` in `.claude/settings.json`).
