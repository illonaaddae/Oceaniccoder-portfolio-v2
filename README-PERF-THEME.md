

## Performance & Theme Updates (Nov 2025)
- Added `useTheme()` hook to sync `[data-theme]` with localStorage and system preference.
- Prevented theme FOUC using an inline init script in `public/index.html`.
- Wired a theme toggle button inside `Navbar.jsx`.
- Optimized image: `public/images/STEM.jpg` → `STEM.webp` (size reduced dramatically).
- Moved testing libraries to `devDependencies` to slim production installs.
- Code-split large sections with `React.lazy` (already present) — keep imports lazy.

### How light mode works
Your CSS defines variables in `:root` (dark default) and `[data-theme="light"]` for light tokens.  
The hook toggles `document.documentElement.dataset.theme` between `dark` and `light`.

### Build tips
- Use `CI=false npm run build` only if you have strict ESLint rules failing builds.
- Consider `npm i --save-dev @vitejs/plugin-react vite` and migrating to Vite later for faster builds.
