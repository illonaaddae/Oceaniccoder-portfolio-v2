# Portfolio Refactor Plan

## 1. Fix Services Page

### Problem
`ServicesSection.tsx` is a monolithic component that's not working properly.

### Solution
Break into focused sub-components under `src/components/Services/`:

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `servicesData.ts` | Service packages & addon data | ~90 |
| `faqData.ts` | FAQ items data | ~50 |
| `ServiceCard.tsx` | Individual service package card | ~70 |
| `AddonCard.tsx` | Add-on service card | ~45 |
| `FAQAccordion.tsx` | Expandable FAQ list | ~60 |
| `ServicesTabs.tsx` | Tab navigation (packages/addons/custom/faq) | ~50 |
| `CustomQuoteSection.tsx` | Custom quote CTA | ~40 |
| `TrustIndicators.tsx` | Trust badges row | ~35 |
| `ServicesSection.tsx` (rewrite) | Slim orchestrator using above components | ~90 |

---

## 2. Mega Performance Optimization

### 2a. Lazy Loading Routes
- Wrap all route-level components in `React.lazy()` + `Suspense`
- Create a `LoadingSpinner.tsx` fallback component
- Components to lazy-load: `HeroSection`, `AboutSection`, `SkillsSection`, `ProjectsSection`, `ServicesSection`, `TestimonialsSection`, `ContactSection`, `BlogSection`/`BlogList`, `BlogPost`, `ProjectCaseStudy`, `AdminDashboard`, `NotFound`

### 2b. Vite Build Optimization
- Update `vite.config.ts` with:
  - `manualChunks` for: `react-vendor`, `router`, `framer-motion`, `markdown`, `icons`
  - Terser minification with 2-pass compression
  - `drop_console` and `drop_debugger` in production
  - `cssCodeSplit: true`
  - `target: "es2020"`
  - `sourcemap: false` for production

### 2c. Image Performance
- Create `LazyImage.tsx` component with IntersectionObserver
- Native `loading="lazy"` and `decoding="async"` attributes

### 2d. Custom Performance Hooks
- `useDebouncedValue.ts` — debounce search/filter inputs
- `useInView.ts` — IntersectionObserver hook for scroll-triggered animations

### 2e. Entry Point Cleanup
- Clean up `index.tsx` — simplify SW unregistration code (remove verbose logging)

### 2f. Remove Duplicate Config
- Delete `vite.config.js` (keep `vite.config.ts` as authoritative)

---

## 3. Break Files Under 100 Lines

### 3a. API Service (`src/services/api.ts`)
Split into modular files under `src/services/api/`:

| File | Domain | Est. Lines |
|------|--------|-----------|
| `client.ts` | Appwrite client setup & exports | ~20 |
| `projects.ts` | Project CRUD | ~50 |
| `certifications.ts` | Certification CRUD | ~50 |
| `education.ts` | Education CRUD | ~50 |
| `blog.ts` | Blog post CRUD | ~70 |
| `messages.ts` | Messages CRUD | ~50 |
| `testimonials.ts` | Testimonial CRUD | ~50 |
| `journey.ts` | Journey CRUD | ~50 |
| `settings.ts` | Settings get/set | ~40 |
| `auth.ts` | Password hashing & admin auth | ~30 |
| `index.ts` | Barrel re-export for backward compat | ~12 |

Keep `src/services/api.ts` as a thin re-export: `export * from "./api/index"`

### 3b. Other Large Components to Audit
After Services and API, audit and split any remaining files over 100 lines:
- `AdminDashboard.tsx` → check `src/components/AdminDashboard/` subfolder
- `App.tsx` → extract `AnimatedRoutes` and `PageWrapper` if needed
- `Navbar.jsx` / `Footer.jsx` → split if over 100 lines
- `HeroSection.jsx` → split animations/data if over 100 lines

### 3c. Utilities Barrel Export
Create `src/utils/index.ts` to re-export from `formatters`, `validation`, `imageUrls`

---

## Execution Order

1. Read all affected files to understand current state
2. Fix `ServicesSection` — create `Services/` subfolder with sub-components
3. Create `LoadingSpinner.tsx`
4. Update `App.tsx` with lazy loading + Suspense
5. Update `vite.config.ts` with build optimizations
6. Split `api.ts` into domain modules
7. Create performance hooks (`useDebouncedValue`, `useInView`, `LazyImage`)
8. Clean up `index.tsx`
9. Delete `vite.config.js`
10. Audit remaining files > 100 lines and split as needed
11. Run build to verify no errors

---

## Review: TerminalLoader Feature
- Review `TerminalLoader.tsx` implementation
- Provide feedback on animation, accessibility, and performance
