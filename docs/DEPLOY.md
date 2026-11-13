# Деплой RelocateSpend: база, аналитика, хостинг

Схема: **один код — две копии**.

| | Production (для людей) | Staging (для тестов) |
|---|---|---|
| Ветка git | `main` | `dev` |
| Адрес | `relocate-spend.pages.dev` | `dev.relocate-spend.pages.dev` |
| База Supabase | `relocate-spend-prod` | `relocate-spend-dev` |
| Пометка в профиле | — | «тестовая сборка» |

Новое делаете в `dev` → проверяете на тестовом адресе → сливаете в `main` → через 1–2 минуты у всех пользователей появляется плашка «Доступна новая версия».

---

## 1. Supabase (оба проекта)

Повторите шаги 1.1–1.4 в **каждом** проекте: сначала в `relocate-spend-dev`, потом в `relocate-spend-prod`.

### 1.1. Таблицы
**SQL Editor → New query** → вставьте весь файл [`supabase/schema.sql`](../supabase/schema.sql) → **Run**.
Должно появиться `Success. No rows returned`. В **Table Editor** появятся таблицы `records`, `profiles`, `feedback`, `app_config`.

### 1.2. Уведомления в Telegram
1. Откройте [`supabase/telegram.sql`](../supabase/telegram.sql). Замените `ВСТАВЬТЕ_ТОКЕН_ОТ_BOTFATHER` на токен бота, а `ВСТАВЬТЕ_СВОЙ_CHAT_ID` — на свой chat id.
2. **SQL Editor → New query** → вставьте → **Run**.
3. В Telegram придёт «✅ RelocateSpend: уведомления подключены».

Отредактированный файл с токеном **не коммитьте**: вставили, запустили, изменения в файле отменили.

### 1.3. Письма от приложения (свой почтовый сервер)
Письма с кодом подтверждения регистрации и сброса пароля должны приходить любому человеку. Встроенная почта Supabase для этого не подходит: она отправляет письма только участникам вашей команды Supabase и всего несколько в час. Нужен свой SMTP. Ниже — бесплатный **Resend** (3000 писем в месяц, до 100 в день). Нужен домен.

**Resend — один раз:**
1. **resend.com** → Sign up (можно через GitHub).
2. **Domains → Add domain** → введите поддомен, например `mail.вашдомен.com` → Region: **Ireland (eu-west-1)** → Add.
3. Resend покажет 3–4 DNS-записи (MX, TXT/SPF, TXT/DKIM). Добавьте их у регистратора или в DNS (Cloudflare → ваш домен → DNS → Add record) точно как указано → в Resend нажмите **Verify DNS Records**. Обычно проходит за 5–30 минут.
4. **API Keys → Create API key** → Name `supabase`, Permission **Sending access** → скопируйте ключ `re_…`. Он показывается один раз. Никому его не присылайте.

**Supabase — в каждом проекте (dev и prod):**
1. **Authentication → Emails → SMTP Settings** (или Project Settings → Authentication → SMTP) → **Enable custom SMTP**:

   | Поле | Значение |
   |---|---|
   | Sender email | `noreply@mail.вашдомен.com` |
   | Sender name | `RelocateSpend` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | ключ `re_…` |

   → **Save**.
2. **Authentication → Rate Limits** → *Rate limit for sending emails* → `100` в час (по умолчанию после подключения SMTP — 30).
3. **Authentication → Emails → Templates**:
   - **Confirm signup** → Subject: `Код подтверждения RelocateSpend: {{ .Token }}` → Body: всё содержимое [`supabase/email-templates/confirm-signup.html`](../supabase/email-templates/confirm-signup.html) → Save.
   - **Reset Password** → Subject: `Сброс пароля RelocateSpend: {{ .Token }}` → Body: [`supabase/email-templates/reset-password.html`](../supabase/email-templates/reset-password.html) → Save.

   В письмах **код из 6 цифр**, а не ссылка: на iPhone ссылка открывается в Safari, а не в установленном приложении. Код человек вводит прямо в приложении.

### 1.4. Вход по почте
**Authentication → Sign In / Providers → Email**:
- **Enable Email provider** — включено;
- **Confirm email** — **включено** (после шага 1.3): без подтверждения почты нельзя войти, значит сброс пароля всегда дойдёт до владельца;
- **Minimum password length** — `8`;
- **Email OTP Length** — `6`, **Email OTP Expiration** — `3600` (1 час).

**Authentication → URL Configuration → Site URL** — адрес сайта: в prod `https://relocate-spend.pages.dev`, в dev `https://dev.relocate-spend.pages.dev`. Адрес станет известен после шага 3.

### 1.5. Проверка
Откройте приложение (локально — `npm run dev` с `.env.local`) → «Создать аккаунт» → на почту придёт письмо с кодом → введите код → вы в аккаунте. Затем выйдите → «Забыли пароль?» → придёт код сброса.
Письма не приходят? Resend → **Emails**: там видно каждое письмо и причину ошибки. Supabase → **Logs → Auth**.

### 1.6. Капча Cloudflare Turnstile (защита от ботов)
Порядок важен: **сначала** ключ в приложении, **потом** включение в Supabase. Иначе вход перестанет работать.

1. **Cloudflare → Turnstile → Add widget**:
   - Widget name: `RelocateSpend`
   - Hostnames: `app.relocatespend.app`, `relocate-spend.pages.dev`, `dev.relocate-spend.pages.dev`, `localhost`
   - Widget Mode: **Managed**
   - → Create. Скопируйте **Site key** (публичный) и **Secret key** (секретный, никому не присылать).
2. **Site key в приложение:**
   - Cloudflare Pages → relocate-spend → Settings → Variables: `VITE_TURNSTILE_SITE_KEY` = Site key, в **Production и Preview**;
   - локально — та же строка в `.env.local`;
   - затем новый деплой (push или Retry deployment).
3. Убедитесь, что на сайте всё работает (вход, регистрация).
4. **Supabase → Authentication → Bot and Abuse Protection** (Attack Protection) → **Enable CAPTCHA protection** → Provider **Turnstile by Cloudflare** → Secret key → Save. В **обоих** проектах.

Капча обычно невидима. Окошко «Я не робот» появляется только при подозрении на бота.

### 1.7. Защита отзывов от спама
SQL Editor → вставить [`supabase/migrations/002_feedback_rate_limit.sql`](../supabase/migrations/002_feedback_rate_limit.sql) → Run. В **обоих** проектах.
Не больше 5 отзывов в час с одного устройства и не больше 50 за 10 минут на всё приложение.

### 1.8. Группы трат (совместный бюджет) — пока только DEV
SQL Editor проекта **relocate-spend-dev** → вставить [`supabase/migrations/003_groups.sql`](../supabase/migrations/003_groups.sql) → Run.
В **prod** этот скрипт запускаем, только когда группы будут готовы к выпуску. Иначе в основной версии появятся таблицы, которыми ещё никто не пользуется (это не страшно, но лучше по порядку).

---

## 2. PostHog (аналитика)

1. **Project settings → Project API key** (`phc_…`) — это значение для переменной `VITE_POSTHOG_KEY`.
2. **Project settings → IP data capture** (раздел может называться иначе) — включите **Discard client IP data**: так меньше персональных данных.
3. Через день-два, когда накопятся события, создайте отчёты (**Product analytics → New insight**):

| Что хотите увидеть | Тип отчёта | Настройка |
|---|---|---|
| Сколько людей заходит | **Trends** | событие `app_opened`, *Unique users*, по дням |
| Где люди отваливаются | **Funnel** | `app_opened` → `onboarding_completed` → `expense_added` → `signup_completed` |
| Сколько соглашаются на аккаунт | **Trends** | `auth_prompt_choice`, разбивка по `choice` |
| Кто возвращается | **Retention** | старт: `app_opened`, возврат: `expense_added`, по неделям |
| Активные пользователи | **Trends** | `expense_added`, *Weekly active users* |
| Ждут ли сканер | **Trends** | `scan_soon_tapped`, *Unique users* |
| Откуда приходят | **Web analytics** | готовая вкладка: источники и страницы |

**Все события приложения:**
`app_opened` (с полями `expenses_count`, `logged_in`, `standalone`), `$pageview`, `auth_prompt_shown`, `auth_prompt_choice` (`signup` / `login` / `skip`), `onboarding_completed`, `onboarding_skipped`, `expense_added` (`source`, `items`, `currency`, `category`), `expense_edited`, `expense_deleted`, `category_created`, `scan_soon_tapped`, `signup_opened`, `signup_code_sent`, `signup_completed`, `login`, `logout`, `password_reset`, `account_deleted`, `feedback_sent`, `install_prompt_shown`, `install_accepted`, `whats_new_closed`, `update_applied`.

Суммы, названия трат, комментарии и почта в PostHog **не отправляются**.

---

## 3. Cloudflare Pages (хостинг)

### 3.1. Ветка для тестов
Один раз, в терминале WebStorm:
```bash
git checkout -b dev
git push -u origin dev
git checkout main
```

### 3.2. Проект
1. **dash.cloudflare.com → Workers & Pages → Create** → вкладка **Pages** → **Connect to Git**. Если Cloudflare предлагает Workers, ищите ссылку «Looking to deploy Pages? Get started».
2. Подключите GitHub и выберите репозиторий `relocate-spend`.
3. Настройки сборки:
   - Project name: `relocate-spend` — это будет адрес `relocate-spend.pages.dev`
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **Environment variables** — добавьте ключи **prod**-проекта:

   | Variable | Value |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `VITE_SUPABASE_URL` | Project URL из `relocate-spend-prod` |
   | `VITE_SUPABASE_ANON_KEY` | anon / publishable key из `relocate-spend-prod` |
   | `VITE_POSTHOG_KEY` | `phc_…` |
   | `VITE_APP_ENV` | `production` |
   | `VITE_TURNSTILE_SITE_KEY` | Site key Turnstile (шаг 1.6) |

5. **Save and Deploy**. Через 1–2 минуты сайт откроется по адресу `https://relocate-spend.pages.dev`.

### 3.3. Ключи для тестовой копии
**Проект → Settings → Variables and Secrets** (или *Environment variables*) → окружение **Preview** → те же переменные, но ключи **dev**-проекта и `VITE_APP_ENV` = `staging`.
Затем **Deployments → у ветки dev → Retry deployment**. Тестовая копия: `https://dev.relocate-spend.pages.dev`.

> Переменные `VITE_*` вшиваются в приложение при сборке. После изменения переменных нужен новый деплой (Retry deployment или новый push).

### 3.4. GitHub Pages
Когда Cloudflare заработает, выключите старый хостинг: GitHub → репозиторий → **Settings → Pages → Source: None**. Или удалите файл `.github/workflows/deploy.yml`.

### 3.5. Свой домен (по желанию)
**Проект → Custom domains → Set up a domain**. После этого обновите **Site URL** в Supabase (шаг 1.4).

---

## 4. Как выпускать обновления

```bash
# работаете в dev
git checkout dev
# … правки …
git add . && git commit -m "Что сделано" && git push      # → обновится тестовый адрес

# проверили — выпускаете
git checkout main && git merge dev && git push            # → обновится основной адрес
git checkout dev
```

- У открытого приложения через пару минут появится плашка **«Доступна новая версия · Обновить»**.
- Чтобы рассказать о новинке, добавьте запись в `src/features/app-update/releases.ts`. Тогда после обновления у пользователей откроется окно **«Что нового»**.

## 5. Как включить сканер чеков (или Pro) для всех

Пересобирать ничего не нужно:
**Supabase prod → Table Editor → app_config → строка `features`** → значение `{"qrScan": true, "pro": false}` → **Save**.
Приложение подтянет флаги при следующем открытии: появится окно «Что нового: Сканирование чеков» с кнопкой «Попробовать».

Только на тестовой копии сканер можно включить переменной `VITE_FEATURES=qrScan` в окружении **Preview**.

## 6. Полезные запросы (SQL Editor)

```sql
-- Сколько аккаунтов и сколько из них с тратами
select count(*) as accounts,
       count(*) filter (where exists (
         select 1 from records r where r.user_id = p.user_id and r.kind = 'expense' and not r.deleted
       )) as with_expenses
from profiles p;

-- Самые активные (число трат)
select user_id, count(*) as expenses, max(updated_at) as last_activity
from records where kind = 'expense' and not deleted
group by user_id order by expenses desc limit 20;

-- Новые отзывы
select created_at, kind, message, contact, app_version from feedback
where status = 'new' order by created_at desc;

-- Отметить отзыв прочитанным
update feedback set status = 'read' where id = 1;
```

## 7. Локальный запуск с базой

```bash
cp .env.example .env.local   # вписать ключи DEV-проекта
npm run dev
```

Без `.env.local` приложение работает как раньше: только на устройстве, без входа и отзывов.
