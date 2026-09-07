import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const works = sqliteTable('works', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  mime: text('mime').notNull(),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  projectId: text('project_id').references(() => works.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at').notNull(),
});
export const sessions = sqliteTable('admin_sessions', {
  token: text('token').primaryKey(),
  expiresAt: integer('expires_at').notNull(),
  credential: text('credential').notNull(),
});
export const attempts = sqliteTable('login_attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const siteContent = sqliteTable('site_content', {
  key: text('key').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(1),
});
