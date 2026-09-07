export type ProjectImage = { src: string; alt: string; type?: 'image' | 'video'; id?: string; name?: string };
export type Project = {
  id: string; title: string; category: string; year: string | null;
  client: string | null; description: string; images: ProjectImage[];
  placeholder: boolean; layout: 'featured' | 'portrait' | 'wide' | 'compact';
  art: 'dota' | 'stream' | 'social' | 'identity'; coverText: string;
};
export type ManagedProject = Project & { status: 'draft' | 'published'; updatedAt: number };
// Add images to public/projects, fill this record, and set placeholder to false.
export const projects: Project[] = [
  { id: 'dota', title: 'Всё начинается с клика', category: 'DOTA 2 / ПРЕВЬЮ', year: null, client: null, description: 'Здесь появится подборка превью для Dota 2. Сейчас это демонстрационный разворот: настоящие изображения и описание проекта будут добавлены позже.', images: [], placeholder: true, layout: 'featured', art: 'dota', coverText: 'NEXT\nLEVEL' },
  { id: 'stream', title: 'По ту сторону стрима', category: 'ОФОРМЛЕНИЕ ТРАНСЛЯЦИЙ', year: null, client: null, description: 'Этот разворот подготовлен для оформления трансляций: экранов, оверлеев и панелей канала. Представленная композиция является заглушкой, а не клиентской работой.', images: [], placeholder: true, layout: 'portrait', art: 'stream', coverText: 'OFF\nLINE' },
  { id: 'social', title: 'Вне игрового лобби', category: 'СОЦСЕТИ / ПРОМО', year: null, client: null, description: 'Место для обложек, постов, анонсов и промо-графики. Реальные работы пока не добавлены. Галерея уже готова к нескольким изображениям.', images: [], placeholder: true, layout: 'wide', art: 'social', coverText: 'GG.\nGO NEXT.' },
  { id: 'identity', title: 'Свой знак в игре', category: 'АЙДЕНТИКА / КИБЕРСПОРТ', year: null, client: null, description: 'Здесь будет визуальная система игрового проекта: знак, типографика и примеры применения. Сейчас показана типографическая заглушка.', images: [], placeholder: true, layout: 'compact', art: 'identity', coverText: 'UN\nKNOWN' },
];
