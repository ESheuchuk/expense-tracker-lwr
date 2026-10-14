# План: публичная страница, авторизация и регистрация в LWR + логирование

## Context

Проект — expense tracker на Experience Cloud (LWR, сеть `expense-tracker-lwr`, org `SSO_IDP`). Сейчас в репозитории только baseline-retrieve: нет своих LWC, Apex, объектов и CMDT; сайт закрыт (`authenticationType: AUTHENTICATED`, статус `UnderConstruction`), self-registration выключена, на Login/Register стоят стандартные `community_login:*` компоненты, на Home — заглушка «Start Building Your Page».

Нужно: публичная landing-страница с заглушками и кнопками Log In / Sign Up; собственные логин и регистрация по best practices; после входа — страница-заглушка с приветствием; сквозные правила проекта — в `CLAUDE.md`; специфичное для фичи — в отдельном плане в `.claude/.plans/`; работа в отдельной ветке.

Принятые решения:

- SPA на **нативных маршрутах LWR** (Home / Login / Register / Welcome, навигация `NavigationMixin` без перезагрузки).
- Ошибки LWC — **только в консоль браузера** (управляется CMDT); в `Error_Log__c` — только ошибки Apex.
- Регистрация: **пароль сразу + автологин**, профиль **`Expense Community User`** (клон Customer Community User, уже есть в org, лицензия Customer Community — 5 шт.).
- После логина/регистрации — редирект на **`/welcome`** (заглушка с приветствием).
- Тексты UI — **английский**, через Custom Labels.

---

## Прогресс (чек-лист задач)

- [x] T0. Ветка `feature/public-landing-auth` создана
- [x] T1. Ручные шаги пользователя в org подтверждены (роль админа)
- [x] T2. Профиль `Expense Community User` в репозитории (retrieve)
- [x] T3. `CLAUDE.md` + ESLint-правило против `@wire`
- [x] T4. Логирование: CMDT, `Error_Log__c`, `Log_Event__e`, Apex Logger + тесты
- [x] T5. Auth Apex: CMDT, SiteGateway, AuthService, AuthController + тесты
- [x] T6. LWC: logger, errorUtils, landing, authLoginForm, authRegisterForm, welcomePage + Jest
- [x] T7. Custom Labels, permission sets
- [x] T8. Сайт: views/routes, Network, publish
- [x] T9. Deploy в SSO_IDP, Apex-тесты, Jest, lint
- [~] T10. Финальная проверка (E2E) и отчёт

---

## Шаг 1. Ручные шаги в org (выполняет пользователь, до начала реализации)

1. **Роль админу `ssoidp@greentest.com`.** Setup → Users → назначить любую роль (напр. CEO). Он `siteGuestRecordDefaultOwner` — владелец Account'ов, созданных при регистрации; без роли `Site.createPortalUser` падает с `portal account owner must have a role`.
2. **Профиль `Expense Community User`** — уже создан ✓. Проверить, что в нём нет лишних прав (доступ к объектам проекта будет через permission set `Expense_Tracker_Member`).
3. **Email deliverability** (Setup → Deliverability) = `All email`, если нужны welcome-письма при регистрации.

Всё остальное (permission sets, назначение их guest-пользователю и админу, настройки сети) делается метаданными/CLI в рамках реализации.

## Шаг 2. Ветка и планы

- `git checkout -b feature/public-landing-auth` от `main`.
- Сохранить план фичи в **`.claude/.plans/public-landing-and-auth.md`** (шаги 4–9 этого плана с чек-листом).
- Retrieve профиля в репо: `sf project retrieve start --metadata "Profile:Expense Community User"` (это project-owned метаданные).

## Шаг 3. Документация (`CLAUDE.md`, английский) — только общепроектное

- _Workflow:_ одна фича = одна ветка `feature/<kebab-name>`; план фичи — `.claude/.plans/<feature>.md`; ручные шаги в org в плане всегда идут первыми; в CLAUDE.md — только сквозные правила.
- _Frontend:_ SPA на нативных маршрутах LWR; навигация внутри сайта только `NavigationMixin` (`window.location` — только auth-редиректы и logout); **`@wire` запрещён** (включая LDS-адаптеры) — только императивные вызовы Apex; container/presentational; mobile-first адаптивность (SLDS grid + responsive-классы, медиазапросы 48em/64em, проверка на 320/768/1024+); все тексты — Custom Labels; guest-проверка через `@salesforce/user/isGuest`.
- _Logging:_ LWC — только через `c/logger` (единственный модуль, где разрешён `console`), настройки из `Logger_Setting__mdt.Default`; Apex — `Logger` → `Log_Event__e` (Publish Immediately) → trigger → `Error_Log__c`; шаблон catch в контроллерах: `Logger.error(...)`, `Logger.flush()`, `throw new AuraHandledException(<label>)` — без внутренних деталей в UI.
- _Apex/security:_ SYSTEM_MODE только с комментарием-обоснованием; доступ — permission sets; `Site.*` и прочие платформенные статики — через gateway-обёртку для тестируемости; покрытие ≥ 90%; валидация `startUrl` против open redirect.
- _Site/Org:_ публичный доступ к сайту, маршруты и их Page Access, self-reg профиль `Expense Community User`, permission sets проекта. Обновить «Planned architecture» (часть реализована).
- **ESLint** (`eslint.config.js`): `no-restricted-syntax` запрещает `@wire` (`Decorator[expression.callee.name='wire']`, `Decorator[expression.name='wire']`) с сообщением «Use imperative Apex calls»; override `no-console: off` только для `lwc/logger/*.js`.

## Шаг 4. Логирование (метаданные + Apex)

- **CMDT `Logger_Setting__mdt`**, запись `Default`: `Console_Enabled__c` (true), `Console_Log_Level__c` (ERROR/WARN/INFO/DEBUG, default ERROR), `Apex_Debug_Level__c` (порог `System.debug`), `Apex_Persist_Level__c` (порог сохранения, default ERROR — все ошибки сохраняются всегда).
- **Объект `Error_Log__c`** (OWD Private, AutoNumber `LOG-{000000}`): `Level__c`, `Source__c`, `Message__c` (Long Text), `Stack_Trace__c` (Long Text), `Exception_Type__c`, `Running_User__c` (Lookup User), `Request_Id__c`, `Quiddity__c`, `Context__c` (Long Text, JSON).
- **Platform Event `Log_Event__e`** (Publish Immediately — лог переживает rollback и работает из guest-контекста), те же поля (User Id текстом).
- **Apex:** `LogLevel` (enum); `LoggerSettings` (CMDT, `@TestVisible` override); `Logger` (`error(source, Exception)`, `error/warn/info/debug(source, message)`, буфер, `flush()` → `EventBus.publish`); `LogEventTrigger` → `LogEventTriggerHandler` (insert `Error_Log__c`, partial success, работает как Automated Process); `LoggerController.getClientSettings()` (`cacheable=true`) → `LoggerSettingsDTO {consoleEnabled, level}`.
- Тесты: `LoggerTest`, `LogEventTriggerHandlerTest` (`Test.getEventBus().deliver()`), `LoggerControllerTest`.

## Шаг 5. Авторизация/регистрация (Apex)

- **CMDT `Auth_Setting__mdt`**, запись `Default`: `Username_Suffix__c` (username = email + суффикс, напр. `.expensetracker` — username глобально уникален), `Default_Start_Url__c` = `/welcome`. Профиль новых пользователей задаёт сеть (`selfRegProfile`), не Apex.
- `SiteGateway` (virtual, `@TestVisible static instance`) — обёртка над `Site.login`, `Site.createPortalUser`, `Site.validatePassword`; в тестах подменяется stub-наследником.
- DTO: `LoginRequestDTO`, `RegistrationRequestDTO`, `AuthResultDTO {redirectUrl}`; `AuthException`.
- `AuthService` (`with sharing`):
    - `login`: email → username; `startUrl` только относительный путь, иначе `Default_Start_Url__c`; `Site.login` → URL frontdoor.
    - `register`: валидация полей, `Site.validatePassword`, savepoint, `Account` на каждого пользователя (нет data skew и общего доступа между пользователями; DML в SYSTEM_MODE с обоснованием — guest), `User` с `ProfileId` профиля `Expense Community User`, `Site.createExternalUser(user, accountId, password)`; при ошибке rollback + понятное сообщение (дубликат email и т.п.); `AssignMemberPermissionSetJob` (Queueable — `PermissionSetAssignment` это setup DML); затем `Site.login` на `/welcome`.
- `AuthController` — тонкий: `login(LoginRequestDTO)`, `register(RegistrationRequestDTO)`; catch → `Logger` → `AuraHandledException` с Custom Label.
- Тесты: `AuthServiceTest`, `AuthControllerTest`, `AssignMemberPermissionSetJobTest` (успех, неверный пароль, дубликат, невалидный startUrl, запись лога при ошибке).

## Шаг 6. LWC

Без `@wire`, тексты из `@salesforce/label/c.*`, Jest-тесты в `__tests__`, для страничных компонентов targets `lightningCommunity__Page` + `lightningCommunity__Default`.

- `logger` — service-модуль: `createLogger(source)` → `{error, warn, info, debug}`; настройки грузятся один раз императивным `getClientSettings()` (кеш промиса на уровне модуля), сообщения до загрузки буферизуются; при ошибке загрузки — fallback «console on, ERROR».
- `errorUtils` — `reduceErrors(error)` для ошибок Apex/JS.
- **Home (public):** `landingPage` (container) → `siteHeader` (логотип; Log In / Sign Up для гостя, «Open app» + Log out для залогиненного; компактная раскладка на мобильных), `heroSection` (заглушка), `featureList` + `featureCard` (3–4 карточки-заглушки, грид 1/2/3–4 колонки), `siteFooter`.
- `authLoginForm` — email, пароль (show/hide), ссылки на Register и стандартный Forgot Password; `startURL` из `window.location.search`; успех → `window.location.assign(redirectUrl)` (полный редирект обязателен для установки сессии).
- `authRegisterForm` — First/Last name, Email, Password, Confirm; клиентская валидация (`reportValidity`, совпадение паролей); успех → редирект.
- `authCard` — presentational обёртка формы (центр, max-width, адаптив).
- **Welcome (requires login):** `welcomePage` — приветственный текст-заглушка («Welcome to Expense Tracker…», описание будущих разделов), кнопки «Home» и Log out; адаптивная вёрстка.
- Custom Labels: `labels/CustomLabels.labels-meta.xml` (категория `ExpenseTracker`).

## Шаг 7. Доступ и сайт

- Permission sets: `Expense_Tracker_Guest` (Apex `AuthController`, `LoggerController`; Create на `Log_Event__e`), `Expense_Tracker_Member` (`LoggerController`, `Log_Event__e`), `Expense_Tracker_Admin` (Read/Delete `Error_Log__c`, все поля, вкладка). Назначение guest-пользователю и админу — `sf org assign permset` (в т.ч. `--on-behalf-of` guest username).
- `sfdc_cms__site/.../content.json`: `authenticationType` → `AUTHENTICATED_WITH_PUBLIC_ACCESS_ENABLED`; Home: `pageAccess: Public`.
- Views: Home — `c:landingPage` вместо htmlEditor; Login — `c:authLoginForm` вместо `community_login:authLoginForm`/`employeeLoginLink`; Register — `c:authRegisterForm` вместо `community_login:selfRegister`.
- Новые route + view **Welcome** (`urlPrefix: welcome`, `pageAccess: RequiresLogin`, компонент `c:welcomePage`) — по структуре существующих route/view с новыми UUID. Если deploy отвергнет — fallback: создать пустую страницу в Experience Builder и retrieve.
- Правки `content.json` вручную в существующем формате (не через Prettier), после deploy — retrieve бандла для нормализации.
- Network: `selfRegistration: true`, `selfRegProfile` = `Expense Community User`, профиль в `networkMemberGroups`; статус `Live` (иначе гости не видят сайт).

## Шаг 8. Deploy (только по путям, на `SSO_IDP`)

CMDT-типы и записи → `Error_Log__c`, `Log_Event__e` → Apex (logger, затем auth) + trigger → labels → permission sets (+ назначения) → LWC → Network / DigitalExperienceBundle → `sf community publish --name expense-tracker-lwr`.

## Verification

- `npm run lint` (правило ловит `@wire`), `npm test` — все Jest-тесты зелёные.
- `sf apex run test --class-names LoggerTest,LogEventTriggerHandlerTest,LoggerControllerTest,AuthServiceTest,AuthControllerTest,AssignMemberPermissionSetJobTest --result-format human --synchronous --code-coverage` — покрытие ≥ 90%.
- E2E в браузере (инкогнито): landing открывается без логина; адаптив на 320/768/1280; кнопки ведут на Login/Register без перезагрузки; регистрация → автологин → `/welcome`; у нового пользователя профиль `Expense Community User` и permset `Expense_Tracker_Member`; logout → логин существующим → `/welcome`; `/welcome` гостем → редирект на Login; неверный пароль → понятная ошибка; ошибки в консоли видны при `Console_Enabled__c = true` и не видны при `false`.
- Искусственная ошибка Apex (дубликат регистрации) → запись в `Error_Log__c`.
- Коммит и push — только с подтверждения пользователя.

## Отклонения от плана (по факту реализации)

- `Site.createPortalUser` вместо `createExternalUser` (лицензия Customer Community, как в стоковом контроллере).
- `Expense_Tracker_Guest` не создан: permission set с лицензией Guest User License не деплоится через Metadata API. Доступ guest (классы `AuthController`, `LoggerController`, Create на `Log_Event__e`) выдан в профиле `expense-tracker-lwr Profile`.
- `Expense_Tracker_Member` создан без лицензии (иначе его нельзя назначить в тестах и внутренним пользователям); профиль `Expense Community User` дополнительно получил доступ к `LoggerController`, чтобы логгер работал сразу после редиректа, до выполнения Queueable.
- Компоненты переименованы: `loginForm` → `authLoginForm` (конфликт со стоковым Aura-бандлом `loginForm`), `registerForm` → `authRegisterForm`.
- `Error_Log__c`: включён Streaming API (Salesforce требует включать Sharing/Bulk/Streaming вместе).
- Сайт LWR отдаётся с корня домена (`https://sooidp-dev-ed.develop.my.site.com/`), без префикса `vforcesite`.
- Сайт опубликован, статус сети `Live`.
- Профили в `Network` оставлены в исходном регистре (retrieve присылает их строчными).

## Результаты проверок

- Jest: 10 suites / 31 tests passed; ESLint чистый.
- Apex: 26 tests passed; покрытие классов проекта 78–100% (`SiteGateway` 78% — `Site.validatePassword` нельзя вызвать вне контекста сайта).
- HTTP: `/`, `/login`, `/SelfRegister` → 200 для гостя; `/welcome` → 302 на `/login?startURL=%2Fwelcome`.
- **Не проверено автоматически (нужен браузер):** регистрация нового пользователя → автологин → `/welcome`, адаптивность на 320/768/1280, поведение консоли при `Console_Enabled__c = true/false`.

## Ревью после ручной проверки (2026-10-13)

Найдено и исправлено:

1. **Регистрация/логин всегда возвращали «Please fill in all required fields».** DTO-параметры были объявлены полями без `{ get; set; }` — Aura-десериализатор такие поля не заполняет, Apex получал пустые значения. Apex-тесты не ловили, т.к. собирали DTO напрямую. Исправлено во всех DTO.
2. **Сравнение паролей было регистронезависимым** (`!=` для строк в Apex игнорирует регистр). Заменено на `.equals()`, добавлен тест.
3. **`Site.login` бросает исключение при неверном пароле**, а не возвращает `null`: каждая опечатка в пароле показывалась как «Something went wrong» и писалась в `Error_Log__c`. Теперь это «Incorrect email or password.» без записи ERROR.
4. **Сброс пароля не работал:** стоковая форма просит username, а он = email + суффикс. Сделан `authForgotPasswordForm` + `AuthController.forgotPassword` (ответ одинаковый для существующих и несуществующих email — без перечисления аккаунтов).
5. **Пробелы в ссылках** («account?Log In»): компилятор LWC удаляет пробел между выражением и элементом. Текст и ссылка разнесены по элементам с `gap`.
6. **`href="#"` в ссылках** → настоящие URL через `NavigationMixin.GenerateUrl`; Ctrl/Cmd-клик открывает новую вкладку.
7. **Захардкоженные цвета** → styling hooks темы `--dxp-*` с fallback.

Пояснение по `expense-tracker-lwr Profile`: это не новый профиль — его Salesforce создал вместе с сайтом как профиль **guest-пользователя** (анонимного посетителя, лицензия Guest User License); он есть в baseline-коммите `53e6224`. `Expense Community User` — профиль **зарегистрированных** пользователей. Форма логина/регистрации вызывается анонимно, поэтому доступ к `AuthController` нужен именно guest-профилю. Я только добавил ему доступ к двум классам и Create на `Log_Event__e`.

Открытые вопросы / рекомендации (не реализовано):

- Подтверждение email, CAPTCHA, rate limiting — вынесены в `.claude/.plans/backlog.md`.
- `AssignMemberPermissionSetJob` выполняется в контексте guest-пользователя; после первой реальной регистрации проверить, что permset назначен и в `Error_Log__c` нет ошибок.

## Ревью, раунд 2 (2026-10-13)

1. **Регистрация: `Field is not writeable: User.ProfileId`** (поймано логгером, `LOG-000000`). Guest-пользователь не может писать `User.ProfileId`. Присваивание убрано: профиль ставит `Site.createPortalUser` из `Network.selfRegProfile` (= `Expense Community User`). Поле CMDT `Auth_Setting__mdt.Member_Profile_Name__c` удалено (в org и в репо).
2. **Layout `Error_Log__c`:** секции Information / Error Details / Request / System Information, все поля read-only, без Clone; compact layout `Error_Log_Compact`; list view `All Errors` с колонками (дата, уровень, источник, тип, сообщение, пользователь).
3. Бэклог (подтверждение email, CAPTCHA, rate limiting, retention логов, лицензии) — `.claude/.plans/backlog.md`.

Статус: ждёт повторной ручной проверки регистрации пользователем. Коммит — только по явной просьбе.

## Ревью, раунд 3 (2026-10-13)

Подтверждено пользователем: регистрация и логин работают. Проверено в org: у нового пользователя профиль `Expense Community User`, `Expense_Tracker_Member` назначен Queueable из guest-контекста.

1. **Иконка «показать пароль» была вне поля.** `lightning-input` не умеет иконку внутри, `lightning-button-icon` стоял рядом. Новый компонент `c/passwordInput` по SLDS-паттерну «input with icon» (сайт на synthetic shadow — классы SLDS применяются), повторяет API `lightning-input` (`name`, `value`, `change`, `reportValidity`, `setCustomValidity`). Используется в логине и в обоих полях пароля регистрации.
2. **Layout `Error_Log__c` «не работает».** UI API для админа отдаёт новый layout (4 секции, все поля). На скриншоте — кэш Lightning (вкладка открыта до деплоя). Лечится жёсткой перезагрузкой; в dev-org рекомендуется отключить Session Settings → «Enable secure and persistent browser caching».
3. **Сброс пароля не доходит.** Результат `Site.forgotPassword` нигде не сохранялся. Теперь: `false` для существующего активного пользователя → ERROR в `Error_Log__c`; успех/неизвестный email → INFO. `AuthController` всегда делает `Logger.flush()` в `finally`. **Временно в org** `Logger_Setting.Default.Apex_Persist_Level__c = INFO` (в репо — `ERROR`) — вернуть после диагностики.
    - Отправитель писем сайта — `sheuchuk.ed@gmail.com` (Network `emailSenderAddress`). Письмо уходит с серверов Salesforce от имени gmail.com; DMARC gmail `p=none`, поэтому не отклоняется, но часто попадает в «Спам».
4. **SPA и спиннер.** `/login`, `/SelfRegister`, `/ForgotPassword` — маршруты нашего LWR-сайта (route `Login`, `Register`, `Forgot_Password`), переходы между ними и с Home — клиентские через `NavigationMixin`, без перезагрузки. Полная перезагрузка только при входе (`frontdoor.jsp`, спиннер держится до ухода со страницы) и выходе. Глобальный индикатор смены маршрута потребовал бы `CurrentPageReference`, а он доступен только через `@wire` — запрещён правилом проекта.

## Раунд 4: письма (2026-10-13)

- Пользователь добавил и верифицировал `sheuchuk.ed@gmail.com` в Organization-Wide Email Addresses — письма сайта начали доходить.
- `LOG-000001` (INFO): `Site.forgotPassword` вернул `true` в 10:06:52 — запрос сброса принят Salesforce.
- Скриншот пользователя — **приветственное** письмо, не письмо сброса. В нём был технический username с суффиксом (`…@gmail.com.expensetracker`), хотя вход по email.
- Свои шаблоны в папке `email/ExpenseTracker` (стоковые не тронуты), подключены в Network:
    - `ET_Community_Welcome` (`welcomeTemplate`) — вход «with your email address», без username.
    - `ET_Community_Forgot_Password` (`forgotPasswordTemplate`) — явный текст «To choose a new password, open this link: {!Community_Url}»; в письме сброса `{!Community_Url}` — одноразовая ссылка смены пароля.
- Ссылки в письмах ведут на `/vforcesite` (URL-префикс сети), откуда 301 на корень LWR-сайта — работают.
- Проверено пользователем: письмо сброса пришло, пароль сменён по ссылке.
- `Apex_Persist_Level__c` в org возвращён в `ERROR`.

## Статус проверки (2026-10-13)

Проверено пользователем вручную: регистрация → автологин → `/welcome`, логин, сброс пароля по письму.

Ещё не проверено: адаптивная вёрстка на 320/768/1280, иконка пароля внутри поля (`c/passwordInput`), layout `Error_Log__c` после перезагрузки, включение/выключение консоли через `Console_Enabled__c`, ревью всего кода пользователем. Коммит — только после этого и по явной просьбе.
