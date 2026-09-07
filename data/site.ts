export const site = {
  name: 'SXCRED', year: '2026',
  intro: 'Делаю визуал для тех, кто в игре. Превью, стримы и графика с характером.',
  about: 'Я SXCRED. Создаю визуал на стыке гейминга, интернет-культуры и соревновательной сцены.',
  aboutDetail: 'Чаще всего работаю с Dota 2 и стримерами: от превью, которое хочется открыть, до цельного оформления канала. Люблю сильную типографику, контраст и детали, которые замечаешь не сразу.',
  contactLine: ['СДЕЛАЕМ', 'ЧТО-ТО', 'МОЩНОЕ.'],
  // Null renders an unavailable contact, never a fake link.
  contacts: [
    { label: 'Telegram', url: null as string | null },
    { label: 'Discord', url: null as string | null },
    { label: 'Email', url: null as string | null },
    { label: 'Instagram', url: null as string | null },
    { label: 'Behance', url: null as string | null },
  ],
};
export const navigation = [
  { label: 'Работы', href: '#work', number: '01' },
  { label: 'Клиенты', href: '#clients', number: '02' },
  { label: 'Обо мне', href: '#about', number: '04' },
  { label: 'Контакт', href: '#contact', number: '05' },
];
export const services = [
  { title: 'Превью', english: 'THUMBNAILS', description: 'Превью для YouTube, стримов и игровых видео. Акцент на идее, композиции и читаемости даже в маленьком размере.' },
  { title: 'Оформление стримов', english: 'STREAM DESIGN', description: 'Экраны ожидания, оверлеи, панели и оформление канала. Единый визуальный язык всей трансляции.' },
  { title: 'Социальные сети', english: 'SOCIAL MEDIA', description: 'Обложки, посты, анонсы и оформление сообществ. Графика, которая остаётся узнаваемой в ленте.' },
  { title: 'Киберспорт', english: 'ESPORTS', description: 'Визуал для команд, матчей и турниров. От анонса состава до графики большого финала.' },
  { title: 'Айдентика', english: 'VISUAL IDENTITY', description: 'Логотип, типографика и визуальная система для автора или игрового проекта.' },
  { title: 'Промо-арт', english: 'PROMO ARTWORK', description: 'Постеры, ключевые образы и рекламная графика для релизов, событий и коллабораций.' },
];
