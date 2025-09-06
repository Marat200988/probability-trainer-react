# Вероятностный тренажёр (React + Vite + Tailwind)

Одностраничное приложение для тренировки вероятностного мышления: 5 ежедневных задач, режим Practice, уверенность (Brier score), объяснения.

## Локальный запуск
```bash
npm i
npm run dev
```

## Сборка и предпросмотр
```bash
npm run build
npm run preview
```

## Деплой на Render (Static Site)
1. Запушьте репозиторий на GitHub.
2. На Render: **New + Static Site** → подключите репозиторий.
3. Build Command: `npm ci && npm run build`
4. Publish directory: `dist`
5. Save → Render раздаст сайт с CDN.

## Структура
- `src/App.jsx` — всё приложение.
- `src/index.css` — Tailwind.
- `index.html` — корневая страница.

## Заметки
- Таймзона ежедневного режима: Europe/Berlin.
- Прогресс хранится в LocalStorage (LS_KEY = `prob-trainer-v1`).
- Можно экспортировать/импортировать прогресс JSON.
