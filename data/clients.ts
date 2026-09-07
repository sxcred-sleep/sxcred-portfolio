export type Client = { name: string; avatar: string | null; category: string; workType: string | null; link: string | null };
export type ManagedClient = Client & { id: string; avatarId: string | null };
export const clients: Client[] = [
  { name: 'blindzonexgod', avatar: null, category: 'Стример / Креатор', workType: null, link: null },
  { name: 'mangekyou', avatar: null, category: 'Стример / Креатор', workType: null, link: null },
  { name: 'Uniquee', avatar: null, category: 'Стример / Креатор', workType: null, link: null },
];
