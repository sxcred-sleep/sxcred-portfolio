export const site = {
  name: 'SXCRED', year: '2026',
  intro: 'Делаю визуал для тех, кто в игре. Превью, стримы и графика с характером.',
  about: 'Я Миля. Создаю визуал на стыке гейминга, интернет-культуры и соревновательной сцены.',
  aboutDetail: 'Чаще всего работаю с Dota 2 и стримерами: от превью, которое хочется открыть, до цельного оформления канала. Люблю сильную типографику, контраст и детали, которые замечаешь не сразу.',
  contactLine: ['СДЕЛАЕМ', 'ЧТО-ТО', 'МОЩНОЕ.'],
  // Null renders an unavailable contact, never a fake link.
  contacts: [
    { label: 'Telegram', url: null as string | null },
    { label: 'Discord', url: null as string | null },
    { label: 'Twitch', url: null as string | null },
    { label: 'Email', url: null as string | null },
    { label: 'Instagram', url: null as string | null },
  ],
};
export const navigation = [
  { label: 'Работы', href: '#work', number: '01' },
  { label: 'Клиенты', href: '#clients', number: '02' },
  { label: 'Услуги', href: '#services', number: '03' },
  { label: 'Обо мне', href: '#about', number: '04' },
  { label: 'Контакт', href: '#contact', number: '05' },
];
export const services = [
  { title: 'Оформление YouTube-канала', english: 'YOUTUBE / ПАКЕТ', description: 'Цельный визуальный стиль для твоего канала. Состав оформления согласуем по ТЗ.' },
  { title: 'Оформление Twitch-канала', english: 'TWITCH / ПАКЕТ', description: 'Оформление канала в едином стиле. Нужные элементы и форматы определим по ТЗ.' },
  { title: 'Отдельный баннер / шапка', english: 'БАННЕР / ШАПКА', description: 'Один выразительный акцент для канала или профиля — под нужную площадку и размер.' },
  { title: 'Панели для Twitch', english: 'TWITCH / 5–7 ШТ.', description: 'Набор из 5–7 панелей в едином стиле. Разделы и наполнение согласуем по ТЗ.' },
];
