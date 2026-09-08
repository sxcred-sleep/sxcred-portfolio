# Публикация SXCRED в Cloudflare

Конфигурация `wrangler.cloudflare.json` использует D1 `sxcred-db` и закрытый R2 `sxcred-media`. Оба ресурса должны существовать в одном аккаунте Cloudflare. Обычный `npm run dev` сохраняет прежние локальные хранилища; `npm run build` сохраняет сборку Sites.

## GitHub → Workers Builds

Сначала загрузите изменения проекта в GitHub, включая новые файлы конфигурации и скриптов.

- Worker name: `sxcred-portfolio`
- Production branch: `main`
- Root directory: корень репозитория (пустое поле)
- Build command: `npm run build:cloudflare`
- Deploy command: `npm run db:migrate:remote && npx wrangler deploy --config dist/server/wrangler.json`
- Node.js: 22.13 или новее

Токен сборки должен иметь доступ к Workers, используемым D1 и R2. Команда миграций создаёт таблицы в удалённой базе; при следующих запусках применяет только новые миграции. Не используйте production-команду публикации для preview-веток.

## Пароль админки

В настройках опубликованного Worker → Variables and Secrets добавьте секрет `ADMIN_PASSWORD_HASH`. Его значение — текст после `ADMIN_PASSWORD_HASH=` в локальном `.dev.vars`, без имени переменной. Это хеш, а не обычный пароль. Не добавляйте `.dev.vars` и `.admin-password.local.txt` в GitHub. Примените изменения настроек; для входа используйте пароль из `.admin-password.local.txt`.

## Данные и домен

Локальная база и загруженные через локальную админку медиа не переносятся с исходным кодом. До переноса данных онлайн-сайт использует начальный контент. Данные переносите отдельно или заполняйте через онлайн-админку.

После проверки сайта на workers.dev подключите домен в Worker → Settings → Domains & Routes → Add → Custom Domain. Домен должен находиться в вашем аккаунте Cloudflare. R2 оставьте закрытым: опубликованные файлы выдаёт `/api/media/…`.
