import type { Language } from '@/shared/i18n';

/**
 * Текст политики конфиденциальности. Хранится отдельно от словаря: он длинный
 * и меняется юридически, а не вместе с интерфейсом. При изменении — обновите дату.
 */
export interface PrivacySection {
  title: string;
  text: string[];
}

export const PRIVACY_UPDATED: Record<Language, string> = {
  ru: 'Редакция от 11 ноября 2026 г.',
  en: 'Last updated: 11 November 2026',
  sr: 'Poslednja izmena: 11. novembar 2026.',
};

export const PRIVACY: Record<Language, PrivacySection[]> = {
  ru: [
    {
      title: 'Коротко',
      text: [
        'RelocateSpend — приложение для учёта личных расходов, сейчас в бета-версии. Мы собираем минимум данных, не показываем рекламу и не продаём информацию о вас.',
      ],
    },
    {
      title: 'Без аккаунта',
      text: [
        'Траты, категории и настройки хранятся только на вашем устройстве — в памяти браузера или установленного приложения. Мы их не получаем. Если очистить данные браузера или удалить приложение, записи пропадут.',
      ],
    },
    {
      title: 'С аккаунтом',
      text: [
        'Мы храним почту, пароль в зашифрованном виде (хеш — сам пароль никто не видит) и ваши записи: траты, категории и настройки. Это нужно, чтобы данные не потерялись и были доступны на других устройствах.',
        'Данные хранятся у сервиса Supabase на серверах в Европейском союзе (Франкфурт). Доступ к записям есть только у вашего аккаунта.',
      ],
    },
    {
      title: 'Анонимная статистика',
      text: [
        'Чтобы понимать, чем пользуются и что улучшать, приложение отправляет события вроде «открыл приложение», «добавил трату», «прошёл обучение», а также тип устройства и браузера. Суммы, названия, комментарии и почта не отправляются.',
        'Статистику обрабатывает сервис PostHog на серверах в ЕС. Её можно выключить в профиле — переключатель «Анонимная статистика».',
      ],
    },
    {
      title: 'Отзывы',
      text: [
        'Если вы пишете нам через «Отзыв или идею», мы получаем текст сообщения, контакт (если вы его указали), версию приложения и тип устройства.',
      ],
    },
    {
      title: 'Ваши права',
      text: [
        'Удалить аккаунт и все данные в облаке можно в любой момент: Профиль → «Удалить аккаунт». Удаление происходит сразу и безвозвратно.',
        'Получить копию данных, исправить их или задать вопрос можно через «Отзыв или идею» в профиле.',
      ],
    },
    {
      title: 'Изменения',
      text: ['Если политика существенно изменится, мы сообщим об этом в приложении.'],
    },
  ],
  en: [
    {
      title: 'In short',
      text: [
        'RelocateSpend is a personal expense tracker, currently in beta. We collect as little data as possible, show no ads and never sell information about you.',
      ],
    },
    {
      title: 'Without an account',
      text: [
        'Expenses, categories and settings are stored only on your device — in the browser or the installed app. We do not receive them. Clearing browser data or removing the app deletes them.',
      ],
    },
    {
      title: 'With an account',
      text: [
        'We store your email, your password in hashed form (nobody can see the password itself) and your records: expenses, categories and settings. This keeps your data safe and available on other devices.',
        'Data is stored with Supabase on servers in the European Union (Frankfurt). Only your account can access your records.',
      ],
    },
    {
      title: 'Anonymous statistics',
      text: [
        'To understand what is used and what to improve, the app sends events such as “opened the app”, “added an expense”, “finished the tutorial”, plus device and browser type. Amounts, names, comments and email are never sent.',
        'Statistics are processed by PostHog on servers in the EU. You can turn them off in Profile — the “Anonymous statistics” switch.',
      ],
    },
    {
      title: 'Feedback',
      text: [
        'When you write to us via “Feedback or an idea”, we receive the message, your contact (if provided), the app version and device type.',
      ],
    },
    {
      title: 'Your rights',
      text: [
        'You can delete your account and all cloud data at any time: Profile → “Delete account”. Deletion is immediate and permanent.',
        'To get a copy of your data, correct it or ask a question, use “Feedback or an idea” in Profile.',
      ],
    },
    {
      title: 'Changes',
      text: ['If this policy changes significantly, we will tell you in the app.'],
    },
  ],
  sr: [
    {
      title: 'Ukratko',
      text: [
        'RelocateSpend je aplikacija za praćenje ličnih troškova, trenutno u beta verziji. Prikupljamo minimum podataka, nema reklama i ne prodajemo informacije o vama.',
      ],
    },
    {
      title: 'Bez naloga',
      text: [
        'Troškovi, kategorije i podešavanja čuvaju se samo na vašem uređaju — u pregledaču ili instaliranoj aplikaciji. Mi ih ne dobijamo. Brisanjem podataka pregledača ili aplikacije zapisi nestaju.',
      ],
    },
    {
      title: 'Sa nalogom',
      text: [
        'Čuvamo e-poštu, lozinku u šifrovanom obliku (heš — samu lozinku niko ne vidi) i vaše zapise: troškove, kategorije i podešavanja. Tako se podaci ne gube i dostupni su na drugim uređajima.',
        'Podaci se čuvaju kod servisa Supabase na serverima u Evropskoj uniji (Frankfurt). Pristup zapisima ima samo vaš nalog.',
      ],
    },
    {
      title: 'Anonimna statistika',
      text: [
        'Da bismo razumeli šta se koristi i šta da poboljšamo, aplikacija šalje događaje poput „otvorio aplikaciju”, „dodao trošak”, „završio uputstvo”, kao i tip uređaja i pregledača. Iznosi, nazivi, komentari i e-pošta se ne šalju.',
        'Statistiku obrađuje PostHog na serverima u EU. Možete je isključiti u profilu — prekidač „Anonimna statistika”.',
      ],
    },
    {
      title: 'Utisci',
      text: [
        'Kada nam pišete preko „Utisak ili ideja”, dobijamo tekst poruke, kontakt (ako ste ga naveli), verziju aplikacije i tip uređaja.',
      ],
    },
    {
      title: 'Vaša prava',
      text: [
        'Nalog i sve podatke u oblaku možete obrisati bilo kada: Profil → „Obriši nalog”. Brisanje je trenutno i trajno.',
        'Kopiju podataka, ispravku ili pitanje pošaljite preko „Utisak ili ideja” u profilu.',
      ],
    },
    {
      title: 'Izmene',
      text: ['Ako se politika značajno promeni, obavestićemo vas u aplikaciji.'],
    },
  ],
};
