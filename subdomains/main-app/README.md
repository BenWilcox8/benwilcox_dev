# Ben Wilcox Portfolio (main-app)

Single-page TypeScript React portfolio with a text-first visual style, alternating timeline layout, and modular project sections.

## Scripts

- `npm run dev` - Start local development server.
- `npm run build` - Create production bundle.
- `npm run preview` - Preview production bundle locally.
- `npm run lint` - Run ESLint checks.
- `npm run typecheck` - Run strict TypeScript checks.

## Content Editing

- Update intro/header content in `src/content/profile.ts`.
- Update timeline projects in `src/content/projects.ts`.
- Add new timeline sections by extending the typed `Project` model in `src/types/portfolio.ts`.

## Architecture Notes

- `src/features/keyboard/KeyboardNavProvider.tsx` contains a typed keyboard navigation scaffold prepared for future Vim-style keybindings.
- Timeline rendering is driven by data, so project additions should not require changes to the core layout components.
