// i18n.js — UI strings for Japanese and English.

export const TRANSLATIONS = {
  en: {
    title: 'Cron Describe',
    subtitle: 'Cron expression → natural language description',
    placeholder: 'Enter cron expression, e.g. */15 * * * *',
    labelExpression: 'Expression',
    labelDescriptionEn: 'Description (English)',
    labelDescriptionJa: 'Description (日本語)',
    labelNextFires: 'Next 5 fire times',
    labelExamples: 'Examples',
    errorTitle: 'Invalid expression',
    rebootNote: 'Note: @reboot has no calculable fire times.',
    copyBtn: 'Copy',
    copiedBtn: 'Copied!',
    themeLight: 'Light',
    themeDark: 'Dark',
    lang: 'Language',
    colExpression: 'Expression',
    colDescription: 'Description',
    footer: '© 2026 SEN LLC (SEN 合同会社)',
    clearBtn: 'Clear',
    siblingCronBuilder: 'Build cron expressions →',
    siblingCronTz: 'View timezones →',
  },
  ja: {
    title: 'Cron Describe',
    subtitle: 'cron 式 → 自然言語の説明',
    placeholder: 'cron 式を入力（例: */15 * * * *）',
    labelExpression: '式',
    labelDescriptionEn: '説明（English）',
    labelDescriptionJa: '説明（日本語）',
    labelNextFires: '次回実行 5件',
    labelExamples: '使用例',
    errorTitle: '無効な式',
    rebootNote: '注意: @reboot の次回実行時刻は計算できません。',
    copyBtn: 'コピー',
    copiedBtn: 'コピー済！',
    themeLight: 'ライト',
    themeDark: 'ダーク',
    lang: '言語',
    colExpression: '式',
    colDescription: '説明',
    footer: '© 2026 SEN LLC（SEN 合同会社）',
    clearBtn: 'クリア',
    siblingCronBuilder: 'ビルダー →',
    siblingCronTz: 'タイムゾーン表示 →',
  },
};

/** @param {'en'|'ja'} lang @param {string} key */
export function t(lang, key) {
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key;
}

export const EXAMPLES = [
  { expr: '* * * * *',      en: 'Every minute',                                   ja: '毎分実行' },
  { expr: '*/15 * * * *',   en: 'Every 15 minutes',                               ja: '15分ごと' },
  { expr: '0 * * * *',      en: 'At :00 past every hour',                         ja: '毎時0分' },
  { expr: '0 9 * * *',      en: 'At 09:00 every day',                             ja: '毎日9時0分' },
  { expr: '0 0 * * *',      en: 'At 00:00 every day (midnight)',                  ja: '毎日0時0分（深夜）' },
  { expr: '30 14 * * 1-5',  en: 'At 14:30 on weekdays',                           ja: '平日の14時30分' },
  { expr: '0 9 * * 1,3,5',  en: 'At 09:00 on Monday, Wednesday, and Friday',      ja: '月・水・金の9時0分' },
  { expr: '0 0 1 * *',      en: 'At 00:00 on the 1st of every month',             ja: '毎月1日0時0分' },
  { expr: '0 0 1 1 *',      en: 'At 00:00 on January 1st',                        ja: '1月1日0時0分' },
  { expr: '*/5 9-17 * * 1-5', en: 'Every 5 minutes during 09:00-17:00 on weekdays', ja: '平日の9〜17時の5分ごと' },
  { expr: '@hourly',        en: 'Every hour (shortcut)',                           ja: '毎時（ショートカット）' },
  { expr: '@daily',         en: 'Every day at midnight (shortcut)',                ja: '毎日深夜（ショートカット）' },
  { expr: '@weekly',        en: 'Every Sunday at midnight (shortcut)',             ja: '毎週日曜深夜（ショートカット）' },
  { expr: '@monthly',       en: 'First of every month at midnight (shortcut)',     ja: '毎月1日深夜（ショートカット）' },
  { expr: '@yearly',        en: 'January 1st at midnight (shortcut)',              ja: '毎年1月1日深夜（ショートカット）' },
  { expr: '@reboot',        en: 'Once at system reboot',                           ja: '起動時に1回実行' },
];
