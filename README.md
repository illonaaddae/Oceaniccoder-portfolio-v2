<!-- prettier-ignore -->
# ✨ Illona Addae | Oceanicoder 💖

![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat&logo=react&logoColor=white)
![Live demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=flat)
![License MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat)

Soft, modern, and minimal — a portfolio that showcases craft, community, and code. This repo contains the source for my personal site: a speedy, accessible, theme-aware React app built to make it easy for hiring teams to evaluate my work and design sense.

🌸 Tone: professional, friendly, and a little playful — inspired by soft pastels, clear typography, and focused UX.

---

## Quick recruiter snapshot ✨

- Senior front-end engineer with 20+ years of experience delivering production web apps and mentoring teams.
- Focus areas: performance, accessibility (a11y), component-driven UI, and delightful product experiences.
- Tech & craft: React, Tailwind/PostCSS, thoughtful SEO, and pragmatic front-end architecture.

Prefer a short walkthrough? I can give a 10–20 minute demo focusing on architecture, performance tradeoffs, and accessibility wins.

---

## Live demo

Visit: https://oceanicoder.dev 🚀

_(The live site uses the same source in this repository.)_

## Snapshot

![Site snapshot](public/images/Live-Snapshot.png)

---

## What makes this repo nice & modern 🌷

- Lightweight React app with component-driven structure.
- Theme-aware (light/dark) with inline init to prevent flashes of unstyled content.
- SEO-friendly meta tags (Open Graph & Twitter) for great link previews.
- Accessibility-first approach: semantic HTML, keyboard focus states, and WCAG-conscious contrasts.

## Tech stack & tools 🧩

- React (CRA-based)
- Tailwind CSS + PostCSS
- Vanilla JS for deterministic behaviours (theme init)
- Deploy-ready for Netlify / Vercel / GitHub Pages

## Project structure (overview)

```
public/
  index.html        # meta tags, theme init script
  manifest.json
  images/            # profile.webp, logo-icon.png, STEM.JPG
src/
  App.js
  index.js
  components/        # Hero, About, Projects, Blog, Contact, Navbar, Footer
  Context/           # theme management
  hooks/
  styles/             # Tailwind + custom css
  utils/data/         # projects, skills, blogs data
```

## Quick start | run locally 💻

1. Clone & enter the repo:

```bash
git clone <this-repo-url>
cd oceanicoder-portfolio-v2-fixed
```

2. Install:

```bash
npm install
# or
yarn
```

3. Start dev server:

```bash
npm start
# or
yarn start
```

4. Run tests / build:

```bash
npm test
npm run build
```

## Deployment

Static build ready. Set build command to `npm run build` and publish the `build/` directory on Netlify/Vercel/GitHub Pages. Add automated CI (GH Actions) if you want PR checks and Lighthouse audits.

## Accessibility & performance highlights 💡

- Inline theme init prevents layout shift and flash-of-unstyled content.
- Critical images are preloaded and authored with modern formats when available.
- Clear ARIA-friendly landmarks and keyboard-first interactions.

## Notes for reviewers — what to scan first 🔎

- `public/index.html` — theme init + SEO meta tags.
- `src/components` — small components with single responsibilities.
- `src/utils/data` — self-contained project, skills, and blog metadata.

## Ideas for quick improvements (optional)

- Add CI (GitHub Actions) to run tests and a Lighthouse check on every PR.
- Add a small animated GIF of the site (put in `public/images/` and reference it here).
- Add badges for CI / Lighthouse results once CI is configured.

## Contributing 🤝

This repo is my personal portfolio  PRs that fix typos, accessibility, or content improvements are welcome. Open an issue or PR with context and I'll review.

## License

MIT - reuse any components or ideas; attribution appreciated.

## Contact ✉️

- Illona Addae | Oceanicoder
- Website: https://oceanicoder.dev
- Twitter: @oceanicoder

If you're a recruiter or technical lead and you'd like a walkthrough, drop me a note via the site and I'll schedule a short demo.

---

Thanks for looking — I'd love to show you the code and the thinking behind it! 🌸
