<div align="center">

# Oceaniccoder Portfolio v2

### A Full-Stack Developer Portfolio with Admin Dashboard, Booking System & Cloud Infrastructure

[![Live Demo](https://img.shields.io/badge/Live_Demo-oceaniccoder.dev-0891b2?style=for-the-badge)](https://oceaniccoder.dev)
[![Azure](https://img.shields.io/badge/Hosted_on-Azure_Static_Web_Apps-0078D4?style=for-the-badge&logo=microsoft-azure)](https://azure.microsoft.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)

![GitHub stars](https://img.shields.io/github/stars/illonaaddae/Oceaniccoder-portfolio-v2?style=flat-square)
![GitHub forks](https://img.shields.io/github/forks/illonaaddae/Oceaniccoder-portfolio-v2?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)

<p align="center">
  <strong>A production-ready portfolio featuring a custom CMS, real-time booking system, Google Calendar integration, AI chatbot, and serverless cloud infrastructure.</strong>
</p>

[Live Demo](https://oceaniccoder.dev) • [Report Bug](https://github.com/illonaaddae/Oceaniccoder-portfolio-v2/issues) • [Request Feature](https://github.com/illonaaddae/Oceaniccoder-portfolio-v2/issues)

</div>

---

## Screenshots

### Portfolio Homepage

![Portfolio Homepage](public/images/Live-Snapshot.png)

### Admin Dashboard

|                     Dashboard Overview                      |                     Content Management                      |
| :---------------------------------------------------------: | :---------------------------------------------------------: |
| ![Dashboard Overview](public/images/dashboard-overview.png) | ![Content Management](public/images/content-management.png) |

|                  Blog Editor                  |               Messages & Analytics                |
| :-------------------------------------------: | :-----------------------------------------------: |
| ![Blog Editor](public/images/blog-editor.png) | ![Messages](public/images/massages-analytics.png) |

---

## ✨ Key Features

### 🖥️ Frontend Excellence

- **Modern React 18** with TypeScript for type-safe development
- **Responsive Design** — Mobile-first with Tailwind CSS, tested on iOS & Android
- **Dark/Light Theme** — System-aware with smooth transitions across every component
- **Performance Optimized** — Code splitting, lazy loading, WebP images
- **Accessible** — WCAG compliant with keyboard navigation & ARIA labels
- **AI Chatbot** — Context-aware assistant that answers questions about the portfolio, built with Claude via Netlify Functions

### 📅 Booking System

- **Multi-step booking form** — Info → Meeting type → Date & time → Message → Confirmation
- **Google Calendar integration** — Meeting events created automatically with Google Meet links
- **Real-time slot availability** — Google Calendar freebusy API disables already-busy time slots
- **Double-booking prevention** — Appwrite-backed slot check runs on date select and at submit
- **Timezone-aware** — Detects and displays the visitor's local timezone
- **4 meeting types** — Discovery Call (30 min), Project Discussion (60 min), Mentorship (45 min), General Chat (30 min)
- **Booking confirmation** — Reference number + Google Meet link sent to both parties

### 🛡️ Admin Dashboard (Custom CMS)

- **Secure authentication** — Password-hashed login with `crypto.subtle` SHA-256; protected at `/admin/dashboard`
- **Public read-only view** — Portfolio stats visible at `/dashboard` without login; sensitive tabs (Bookings, Settings) are hidden and render-blocked
- **Bookings management** — Accept, decline, cancel, and delete meeting requests; real-time 30-second polling; pending count badge in sidebar
- **Full content CRUD** — Projects, blog posts, skills, certifications, education, journey timeline, gallery
- **Rich text blog editor** — Create and edit posts with markdown support, tags, and featured toggles
- **Image & PDF uploads** — Upload, optimize, and manage media assets via Appwrite Storage
- **Message centre** — View, filter, and manage contact form submissions
- **Comments moderation** — Approve or remove visitor comments
- **Testimonials management** — Add, edit, and delete client testimonials
- **Real-time updates** — Instant data sync across all tabs

### ☁️ Cloud Infrastructure

- **Azure Static Web Apps** — Global CDN, SSL/TLS, custom domain
- **Appwrite Cloud** — Database, Storage, Authentication, Messaging
- **Netlify Functions** — Google Calendar event creation, freebusy availability check, AI chatbot endpoint
- **Dual CI/CD pipeline** — Azure deployment on push to `main`; ESLint + security lint in a separate CI workflow
- **GitHub Actions** — Automated builds, linting, and deployments

### 📬 Contact System

- **Dual submission** — Web3Forms + Appwrite Database backup
- **Email notifications** — Automated alerts via Appwrite Messaging
- **Spam protection** — Honeypot fields
- **Message dashboard** — Track, filter, and respond to inquiries

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
├──────────────┬──────────┬───────────┬────────────┬─────────────┤
│  Components  │  Hooks   │  Context  │  Services  │  TypeScript  │
└──────────────┴──────────┴─────┬─────┴────────────┴─────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AZURE STATIC WEB APPS                        │
│         Global CDN • SSL/TLS • Custom Domain • CI/CD            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
┌──────────────────────────┐        ┌──────────────────────────────┐
│      APPWRITE CLOUD      │        │      NETLIFY FUNCTIONS       │
├──────────┬───────────────┤        ├──────────────┬───────────────┤
│ Database │ Storage       │        │ create-      │ get-          │
│ - Projects│ - Images     │        │ booking.mjs  │ availability  │
│ - Blogs  │ - PDFs        │        │ (Calendar +  │ .mjs          │
│ - Skills │               │        │  Meet link)  │ (Freebusy     │
│ - Bookings│ Auth         │        ├──────────────┤  check)       │
│ - Messages│ - Admin      │        │ chat.mjs     │               │
│ - Comments│   sessions   │        │ (AI chatbot) │               │
│ - etc.   │               │        └──────────────┴───────────────┘
│          │ Messaging     │                        │
│          │ - Email SMTP  │                        ▼
└──────────┴───────────────┘        ┌──────────────────────────────┐
                                    │       GOOGLE APIs            │
                                    │  Calendar API • Meet Links   │
                                    └──────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

| Technology          | Purpose                               |
| ------------------- | ------------------------------------- |
| **React 18**        | UI framework with concurrent features |
| **TypeScript**      | Type safety & developer experience    |
| **Tailwind CSS**    | Utility-first styling                 |
| **Vite**            | Next-gen build tool                   |
| **Framer Motion**   | Animations & transitions              |
| **React Router v6** | Client-side routing                   |

### Backend & Cloud

| Technology                | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| **Appwrite Cloud**        | Database, Auth, Storage, Messaging                 |
| **Azure Static Web Apps** | Hosting, CDN, SSL                                  |
| **Netlify Functions**     | Serverless: booking, availability, AI chat         |
| **Google Calendar API**   | Meeting event creation & freebusy availability     |
| **Google Meet**           | Auto-generated video call links for bookings       |
| **Claude API (Anthropic)**| AI chatbot powering portfolio Q&A                  |
| **Web3Forms**             | Contact form submissions                           |
| **Gmail SMTP**            | Email notifications via Appwrite Messaging         |

### DevOps & Tooling

| Technology            | Purpose                        |
| --------------------- | ------------------------------ |
| **Git & GitHub**      | Version control                |
| **GitHub Actions**    | CI/CD + lint + security checks |
| **ESLint**            | Code quality & accessibility   |
| **PostCSS**           | CSS processing                 |
| **npm**               | Package management             |

---

## 📁 Project Structure

```text
oceanicoder-portfolio-v2/
├── .github/
│   └── workflows/
│       ├── azure-static-web-apps.yml   # Azure deployment pipeline
│       └── ci.yml                      # Lint, test & security CI
├── netlify/
│   └── functions/
│       ├── create-booking.mjs          # Google Calendar event + Meet link
│       ├── get-availability.mjs        # Calendar freebusy slot check
│       └── chat.mjs                    # AI chatbot (Claude API)
├── public/
│   └── images/                         # Static assets
├── src/
│   ├── components/
│   │   ├── AdminDashboard/             # CMS — full dashboard layout
│   │   │   ├── index.tsx               # Dashboard root
│   │   │   ├── Sidebar.tsx             # Navigation (hides Bookings & Settings in read-only)
│   │   │   ├── tabs/
│   │   │   │   ├── BookingsTab.tsx     # Booking management (admin only)
│   │   │   │   ├── Overview/           # Stats & recent activity
│   │   │   │   ├── MessagesTab.tsx     # Contact submissions
│   │   │   │   ├── CommentsTab.tsx     # Visitor comments moderation
│   │   │   │   ├── TestimonialsTab.tsx # Testimonials management
│   │   │   │   ├── ProjectsTab.tsx     # Portfolio projects
│   │   │   │   ├── BlogTab.tsx         # Blog post editor
│   │   │   │   ├── SkillsTab.tsx       # Skills & proficiency
│   │   │   │   ├── CertificationsTab.tsx
│   │   │   │   ├── GalleryTab.tsx
│   │   │   │   ├── JourneyTab.tsx
│   │   │   │   ├── EducationTab.tsx
│   │   │   │   ├── AboutTab.tsx
│   │   │   │   └── SettingsTab.tsx     # Password & site config (admin only)
│   │   │   └── modals/                 # CRUD modals
│   │   ├── BookingSection.jsx          # Multi-step booking form
│   │   ├── Chatbot/                    # AI chatbot widget
│   │   ├── Contact/                    # Contact form components
│   │   ├── Projects/                   # Portfolio project cards
│   │   ├── Confetti.tsx                # Celebration animation
│   │   ├── EventBanner.tsx             # Birthday / New Year banners
│   │   └── SupportButton.tsx           # Floating support & promo links
│   ├── services/
│   │   └── api/
│   │       ├── bookings.ts             # Booking CRUD + slot availability
│   │       ├── auth.ts                 # SHA-256 password hashing & verification
│   │       └── client.ts              # Appwrite client config
│   ├── routes/
│   │   ├── adminRoutes.tsx             # /admin/dashboard (auth) + /dashboard (read-only)
│   │   └── publicRoutes.tsx
│   ├── hooks/
│   │   ├── usePortfolioData.ts
│   │   └── useTheme.js
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── imageUrls.ts
│   │   └── logger.ts
│   └── styles/
│       ├── index.css                   # CSS variables & theme tokens
│       └── components.css             # glass-card, glass-input, animations
├── staticwebapp.config.json            # Azure SWA routing config
├── netlify.toml                        # Netlify Functions config
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Appwrite account (free tier works)
- Netlify account (for serverless functions locally: `netlify dev`)
- Google Cloud project with Calendar API enabled (for booking features)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/illonaaddae/Oceaniccoder-portfolio-v2.git
   cd Oceaniccoder-portfolio-v2
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Configure your `.env.local`:

   ```env
   # Appwrite
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=your-project-id
   VITE_APPWRITE_DATABASE_ID=your-database-id
   VITE_APPWRITE_BUCKET_ID=your-bucket-id

   # Admin
   VITE_ADMIN_PASSWORD_HASH=your-sha256-hashed-password
   ```

   For Netlify Functions, set these in your Netlify dashboard or `netlify.toml`:

   ```env
   # Google Calendar (for booking)
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REFRESH_TOKEN=your-refresh-token
   GOOGLE_CALENDAR_ID=your-calendar-id

   # AI Chatbot
   ANTHROPIC_API_KEY=your-anthropic-api-key
   ```

4. **Start development server**

   ```bash
   # Frontend only
   npm run dev

   # Frontend + Netlify Functions (booking & chatbot)
   netlify dev
   ```

5. **Build for production**

   ```bash
   npm run build
   ```

---

## 🗂️ Admin Dashboard

| Route              | Access        | Description                                       |
| ------------------ | ------------- | ------------------------------------------------- |
| `/admin/dashboard` | Password only | Full CMS — all tabs including Bookings & Settings |
| `/dashboard`       | Public        | Read-only portfolio stats; sensitive tabs hidden  |

### Dashboard Tabs

| Tab                | Admin | Public | Description                                         |
| ------------------ | :---: | :----: | --------------------------------------------------- |
| **Overview**       | ✅    | ✅     | Stats, recent activity, site views                  |
| **Bookings**       | ✅    | ❌     | Meeting requests — accept, decline, delete          |
| **Messages**       | ✅    | ✅*    | Contact submissions (*PII blurred in public view)   |
| **Comments**       | ✅    | ✅*    | Visitor comments (*content blurred in public view)  |
| **Projects**       | ✅    | ✅     | Portfolio projects CRUD                             |
| **Blog**           | ✅    | ✅     | Blog post editor with rich text                     |
| **Skills**         | ✅    | ✅     | Skills & proficiency levels                         |
| **Certifications** | ✅    | ✅     | Professional certificates with PDF upload           |
| **Education**      | ✅    | ✅     | Academic credentials                                |
| **Journey**        | ✅    | ✅     | Career timeline entries                             |
| **Gallery**        | ✅    | ✅     | Image uploads with drag-to-reorder                  |
| **Testimonials**   | ✅    | ✅     | Client testimonials                                 |
| **About**          | ✅    | ✅     | Profile, story, resume URL                          |
| **Settings**       | ✅    | ❌     | Password change & site config                       |

---

## 📅 Booking System

The booking page (`/booking`) lets visitors schedule a meeting without any back-and-forth email.

### Booking Flow

```text
Step 1 — Your Info       →  Name, Email, Phone
Step 2 — Schedule        →  Meeting type, Date, Time slot
Step 3 — Message         →  Optional context or questions
Step 4 — Confirmation    →  Booking reference + Google Meet link
```

### How it works

1. Visitor picks a date → Netlify Function checks Google Calendar freebusy API; taken slots appear disabled immediately
2. Appwrite also checks for existing bookings so no two visitors can claim the same slot
3. On submit → Netlify Function creates a Google Calendar event and returns a Meet link
4. Booking saved to Appwrite with `pending` status; admin reviews in the Bookings tab
5. Admin can accept, decline, or delete the booking from the dashboard

### Netlify Functions

| Function               | Endpoint                     | Purpose                                          |
| ---------------------- | ---------------------------- | ------------------------------------------------ |
| `create-booking.mjs`   | `POST /api/create-booking`   | Creates Calendar event, returns Meet link        |
| `get-availability.mjs` | `GET /api/get-availability`  | Returns freebusy map for a given date            |
| `chat.mjs`             | `POST /api/chat`             | AI chatbot — proxies to Claude API               |

---

## 🤖 AI Chatbot

A floating chatbot widget (bottom-right) lets visitors ask questions about the portfolio.

- Powered by **Claude (Anthropic)** via a Netlify Function proxy
- Context-aware — knows about skills, projects, experience, and booking
- Mobile-optimised — `font-size: 16px` input prevents iOS Safari zoom
- Gracefully handles errors and offline states

---

## 🗄️ Database Schema (Appwrite)

### Collections

| Collection | Key Fields |
| --- | --- |
| `projects` | title, description, technologies[], image, liveUrl, githubUrl, featured, category |
| `blog_posts` | title, slug, content, excerpt, tags[], publishedAt, image, featured, published |
| `blog_reactions` | postId, visitorId, reaction (like/dislike) |
| `skills` | name, category, percentage, icon |
| `certifications` | title, issuer, date, credential, platform, image, verifyLink |
| `education` | institution, degree, period, achievement, gpa, universityLogo |
| `journey` | role, company, period, location, achievements[], order, color |
| `messages` | name, email, subject, message, status |
| `bookings` | name, email, phone, meetingType, preferredDate, preferredTime, timezone, message, status |
| `gallery` | src, alt, caption, order |
| `settings` | key, value |
| `about` | title, subtitle, story, profileImage, resumeUrl |

---

## 🚢 Deployment

### Azure Static Web Apps (Production)

The site automatically deploys to Azure on push to `main`:

```yaml
# .github/workflows/azure-static-web-apps.yml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

**Pipeline steps:**

1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Build (`npm run build`)
5. Deploy to Azure Static Web Apps

### Netlify (Serverless Functions)

Booking, availability, and chatbot endpoints are deployed to Netlify Functions. The React frontend calls them via `/api/*` proxy routes configured in `netlify.toml`.

### Environment Variables (GitHub Secrets)

| Secret                            | Description                     |
| --------------------------------- | ------------------------------- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Azure deployment token          |

---

## 📊 Performance Metrics

| Metric                    | Score |
| ------------------------- | ----- |
| Lighthouse Performance    | 95+   |
| Lighthouse Accessibility  | 100   |
| Lighthouse Best Practices | 100   |
| Lighthouse SEO            | 100   |

### Optimisations Implemented

- Code splitting with `React.lazy()` and `Suspense`
- WebP image format with fallbacks
- Tree-shaking with Vite
- Gzip/Brotli compression via Azure CDN
- Prefetching critical resources
- iOS-safe `font-size: 16px` on all inputs (prevents Safari zoom)

---

## 📝 Changelog

### v2.3.0 — Booking System, AI Chatbot & Security

- **Booking system** — Full multi-step booking form with Google Calendar & Meet integration
- **Real-time slot availability** — Freebusy API disables taken slots before user picks them
- **Double-booking prevention** — Appwrite slot check on date select and at submit; button never gets stuck loading
- **Admin Bookings tab** — Accept, decline, cancel, and delete meeting requests with live polling
- **AI chatbot** — Claude-powered assistant; mobile-safe input (no iOS zoom)
- **Dashboard security** — Bookings and Settings tabs removed from public `/dashboard`; render-blocked server-side on `isReadOnly`
- **iOS mobile improvements** — 16px font-size on all inputs, improved touch targets, date input responsive fix

### v2.2.0 — Enhanced User Experience & Engagement Features

- **Support Button** — Floating button (bottom-left) with Buy Me a Coffee & Scrimba links
- **Event Banner System** — Automatic celebration banners (birthday, New Year) with confetti
- **Blog Reactions** — Like/dislike system for blog posts stored in Appwrite
- **Toast Notifications** — User feedback for all CMS operations
- **PDF Upload Support** — Upload PDF certificates alongside images
- **Testimonials tab** — Add, edit, and display client testimonials
- **Comments tab** — Visitor comment moderation in the dashboard

### v2.1.0 — Theme & Forms Polish

- **Theme-aware components** — Consistent dark/light mode across forms (glass-input style)
- **Enhanced mobile UI** — Better responsiveness for admin dashboard & modals
- **Scrimba Ambassador** — 20% discount promotion in footer

### v2.0.0 — Cloud Migration & Dashboard

- Migrated from Netlify to **Azure Static Web Apps**
- Built full **Admin Dashboard** with Appwrite backend
- Implemented **10+ database collections** for content management
- Secure **authentication system** for admin access
- **TypeScript migration** for type safety

---

## 🌟 Special Features

### Support & Promotion Links

A floating heart button (bottom-left) provides quick access to:

| Link                | Description                          |
| ------------------- | ------------------------------------ |
| **Buy Me a Coffee** | Support the developer's work         |
| **Scrimba Pro**     | Get 20% OFF with ambassador discount |

### Event Banner System

Automatic celebration banners appear on special dates:

| Event    | Date       | Features                                  |
| -------- | ---------- | ----------------------------------------- |
| Birthday | April 28   | Pink gradient banner + confetti animation |
| New Year | Jan 1–3    | Gold gradient banner + confetti animation |

_Banners can be dismissed and won't reappear for the same day._

### Blog Reactions

Visitors can interact with blog posts:

- Like and Dislike buttons on each post
- Reactions stored in Appwrite `blog_reactions` collection
- Anonymous tracking via localStorage visitor ID
- Real-time counts displayed

---

## 🤝 Contributing

Contributions are welcome! This is an open-source portfolio that others can learn from and adapt.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 About the Developer

<div align="center">

**Illona Addae** — _Software Engineer & Tech Leader_

Building products that uplift communities through technology.

[![Portfolio](https://img.shields.io/badge/Portfolio-oceaniccoder.dev-0891b2?style=for-the-badge)](https://oceaniccoder.dev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-illona--addae-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/illona-addae/)
[![GitHub](https://img.shields.io/badge/GitHub-illonaaddae-181717?style=for-the-badge&logo=github)](https://github.com/illonaaddae)
[![Twitter](https://img.shields.io/badge/Twitter-illonaaddae-1DA1F2?style=for-the-badge&logo=twitter)](https://twitter.com/illonaaddae)

</div>

---

<div align="center">

### Let's Connect!

I'm always open to discussing new opportunities, collaborations, or just chatting about tech.

**"Technology should not only solve problems. It should uplift people."**

---

⭐ **Star this repo** if you found it helpful!

</div>
