import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * Public privacy notice at /privacy. Every statement here describes what the
 * code does today; check the matching code before changing a claim, and update
 * this page (and LAST_UPDATED) when data handling changes.
 *
 * Production builds leave VITE_DATA_BACKEND unset, so visitor forms, comments
 * and blog counts are written to Appwrite, Turnstile is off and the visitor
 * testimonial form is hidden.
 *
 * TODO(OC-0): when lead attribution ships (first-visit source kept in the
 * browser for 30 days and sent with forms), describe it under "Forms".
 * TODO(OC-0): when VITE_DATA_BACKEND=cosmos ships, re-add the Cloudflare
 * Turnstile spam check (forms section and processor list) and update where
 * form data is stored.
 * TODO(OC-0): at the Azure cutover, when the testimonial form is back, restore
 * its form text: name, role, company (optional), text, rating and an optional
 * photo; submitted testimonials and photos stay hidden until approved.
 */

const CONTACT_EMAIL = "hello@oceaniccoder.dev";
const LAST_UPDATED = "21 October 2026";
const DESCRIPTION =
  "What oceaniccoder.dev collects, why, who processes it, how long it is kept and how to ask for a copy or deletion.";

const linkClass =
  "underline underline-offset-2 text-[var(--accent-teal)] hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)] rounded-sm";

const EmailLink = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
    {CONTACT_EMAIL}
  </a>
);

const Section = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section aria-labelledby={id} className="space-y-4">
    <h2 id={id} className="text-2xl font-semibold text-[var(--text-primary)]">
      {title}
    </h2>
    {children}
  </section>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold text-[var(--text-primary)] pt-2">{children}</h3>
);

const List = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-6 space-y-2">{children}</ul>
);

const PrivacyPage: React.FC = () => (
  <div
    className="min-h-dvh pt-28 pb-20"
    style={{
      background:
        "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
    }}
  >
    <Helmet>
      <title>Privacy · OceanicCoder</title>
      <meta name="description" content={DESCRIPTION} />
      <meta property="og:title" content="Privacy · OceanicCoder" />
      <meta property="og:description" content={DESCRIPTION} />
      <meta property="og:url" content="https://oceaniccoder.dev/privacy" />
    </Helmet>

    <article className="container mx-auto px-6 max-w-3xl space-y-10 text-base leading-relaxed text-[var(--text-secondary)]">
      <header className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)]">
          Privacy notice
        </h1>
        <p className="text-lg">
          This page explains what oceaniccoder.dev collects, why, who helps us handle it and what
          you can ask us to do with it. The short version: we set one sign-in cookie, on quote
          pages; Paystack sets its own cookies only when you open its checkout to pay; there are no
          tracking or advertising cookies, and we only keep what we need to answer you and run the
          business.
        </p>
      </header>

      <Section id="who-we-are" title="Who we are">
        <p>
          This site is run by Illona Addae, trading as OceanicCoder, based in Ghana. For anything
          about your data, email <EmailLink />.
        </p>
      </Section>

      <Section id="visiting" title="When you visit the site">
        <p>
          We count visits with our own simple analytics, which run on our own servers. For each page
          you view, we record:
        </p>
        <List>
          <li>
            the page, by its path only (for example /blog), never anything after it in the link
          </li>
          <li>
            the website that sent you, by its name only (for example linkedin.com), not the full
            address
          </li>
          <li>campaign tags in the link you followed, if any: source, medium and campaign</li>
          <li>your device type (mobile, tablet or desktop), browser family and operating system</li>
          <li>your browser&apos;s language setting</li>
          <li>an approximate country, worked out from your device&apos;s time zone</li>
          <li>how long you stayed on the page</li>
        </List>

        <SubHeading>What we don&apos;t do</SubHeading>
        <List>
          <li>
            We use no tracking or advertising cookies. The only cookie we set is the quote sign-in
            cookie described under &quot;Quotes and payments&quot;. When you pay, Paystack&apos;s
            checkout sets its own cookies.
          </li>
          <li>
            We don&apos;t store your IP address or your browser&apos;s full identifying string. Our
            server uses them briefly, in memory only, to make the daily code described below and to
            block floods of requests, and never saves them.
          </li>
          <li>We don&apos;t track you across other websites.</li>
          <li>We use no third-party analytics or advertising trackers.</li>
        </List>

        <SubHeading>How visitors are counted</SubHeading>
        <p>
          To count visitors without knowing who they are, our server makes an anonymous code from
          your connection details and a random secret that changes every day. Each day&apos;s secret
          is deleted after 48 hours, so nobody, us included, can link the codes from different days
          or trace one back to you.
        </p>
        <p>
          To group the pages you view in one visit, the site keeps a random session id in your
          browser&apos;s session storage. It starts again after 30 minutes without activity and is
          cleared when you close the tab.
        </p>

        <SubHeading>Pages we never record</SubHeading>
        <p>
          Private links we send to clients (quotes, payment pages and receipts) and admin pages are
          never recorded.
        </p>

        <SubHeading>Do Not Track and Global Privacy Control</SubHeading>
        <p>
          If your browser sends a Do Not Track or Global Privacy Control signal, we honour it fully:
          the site sends nothing at all, not even an anonymous count.
        </p>

        <SubHeading>How long we keep it</SubHeading>
        <p>Page-view records are deleted automatically after 90 days.</p>

        <SubHeading>Other things kept in your browser</SubHeading>
        <p>
          The site also uses your browser&apos;s local storage for your light or dark theme choice,
          whether you have seen the intro animation or closed a banner, and a cached list of home
          page images. When we email you a code to open a quote, the page keeps a temporary
          reference to that code in session storage until you enter it or close the tab. None of
          these leave your device except that reference, which is sent back with the code.
        </p>
      </Section>

      <Section id="forms" title="Forms you fill in">
        <p>We only receive what you type into a form, and use it for the reason given.</p>
        <List>
          <li>
            <strong className="text-[var(--text-primary)]">Contact:</strong> your name, email,
            subject and message, so we can reply.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Booking a call:</strong> your name,
            email, phone number (optional), meeting type, date, time, time zone, preferred platform
            and an optional message. We use them to set up the call: a Google Calendar event that
            invites your email address, a Google Meet or Zoom link, and a confirmation email.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Project inquiry:</strong> your name,
            email, phone number (optional), preferred way to be contacted, project type,
            description, features, timeline, budget range, notes, and whether you need a logo,
            domain or hosting. We use them to prepare a quote. We also get a text message alert with
            your name and project type.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Blog comments:</strong> your name, an
            optional email and your comment. Your name and comment are shown publicly on the post.
            Your email is never shown publicly or sent to other visitors; we use it only if we need
            to reply to you.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Testimonials:</strong> the site
            isn&apos;t collecting testimonials through a form right now. The testimonials you see
            are added by us, with the client&apos;s permission.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Newsletter:</strong> your email address
            only, so we can send you new posts.
          </li>
        </List>
      </Section>

      <Section id="quotes-payments" title="Quotes and payments">
        <p>
          When you open a quote in a new browser, we email a 6-digit code to the address on the
          quote. Once you enter it, or open the quote from our email, a sign-in cookie keeps that
          browser signed in to that quote for 30 days. It is used only for that, and it stops
          working early if the quote is revised or its link is replaced. Your IP address is used in
          memory to limit how often codes can be asked for and is never saved. Records of code
          requests and code entries are deleted within two days; counts of wrong codes are kept
          until the quote is revised or its link is replaced. A used sign-in link leaves a random
          marker, kept for 45 days so the link can&apos;t be used twice; it holds nothing about you
          except when the link was used.
        </p>
        <p>
          When you accept a quote, we keep a record of the agreement: the name you type, the time, a
          one-way scrambled (hashed) copy of your IP address, your browser&apos;s identifying string
          and a copy of what you accepted.
        </p>
        <p>
          Card, mobile money and Apple Pay payments are handled by Paystack. The details you enter
          in Paystack&apos;s checkout go to Paystack; we never see your card or mobile money
          details. We keep your name, email, the amount and currency, the Paystack reference, the
          payment method (and the mobile money network, if used), the invoice number and the date
          paid. If you pay by bank transfer, no payment provider is involved.
        </p>
        <p>
          Paystack&apos;s checkout loads from Paystack only when you choose to pay, either in a
          window on our page or on Paystack&apos;s own site. Paystack, and Cloudflare, which
          protects Paystack&apos;s servers, set their own cookies while it is open; Paystack&apos;s
          privacy policy covers them.
        </p>
      </Section>

      <Section id="email" title="Emails and text messages">
        <p>
          Our emails (replies, booking confirmations, quotes, invoices, receipts and the newsletter)
          are sent through Resend, which also holds the newsletter mailing list. You can unsubscribe
          from the newsletter at any time by emailing <EmailLink />.
        </p>
        <p>
          If you give us a phone number with an invoice, we may send you a text message when the
          invoice is sent. Text messages go through Africa&apos;s Talking.
        </p>
      </Section>

      <Section id="chat" title="Chat assistant">
        <p>
          The chat assistant sends what you type, through our server, to OpenAI to write a reply.
          Only the latest 20 messages of the conversation are sent, each cut to 2,000 characters. We
          don&apos;t save chat conversations: the chat lives in your open page and is gone when you
          reload or leave. Please don&apos;t share anything sensitive in the chat.
        </p>
      </Section>

      <Section id="blog" title="Blog reads and reactions">
        <p>
          When you read a blog post, your browser creates a random id and keeps it in local storage.
          It is sent with reads and likes so that each reader is counted once and you can change
          your reaction. It isn&apos;t linked to your name or email. Clearing this site&apos;s data
          in your browser removes it.
        </p>
      </Section>

      <Section id="processors" title="Where your data is stored and who processes it">
        <p>
          Your data is stored with Appwrite and Microsoft Azure. We are moving it from Appwrite to
          Azure, so while that happens a record may be held with either.
        </p>
        <List>
          <li>
            <strong className="text-[var(--text-primary)]">Appwrite</strong> stores what you send
            through the site&apos;s forms (messages, bookings, inquiries and comments),
            testimonials, blog read and reaction counts, quotes, invoices and payment records.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Microsoft Azure</strong> hosts the site
            and our server code, and stores the site&apos;s images and the page-view records.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Paystack</strong> processes payments.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Resend</strong> sends our emails and
            holds the newsletter list.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">OpenAI</strong> writes the chat
            assistant&apos;s replies.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Google</strong> provides Calendar and
            Meet for bookings, and the site&apos;s fonts, which your browser loads from Google.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Zoom</strong> hosts the call if you pick
            Zoom when booking.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Africa&apos;s Talking</strong> sends text
            messages.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">YouTube and Loom</strong> serve the demo
            videos on some project pages. YouTube videos use its privacy-enhanced mode
            (youtube-nocookie.com).
          </li>
        </List>
        <p>Some of these providers handle data outside Ghana.</p>
      </Section>

      <Section id="rights" title="How long we keep data, and your rights">
        <List>
          <li>Page-view records: 90 days, then deleted automatically.</li>
          <li>Newsletter address: until you unsubscribe.</li>
          <li>
            Messages, bookings, inquiries, quotes, comments and testimonials: as long as we need
            them to work with you and keep our records. They are not deleted automatically; ask us
            and we will delete them.
          </li>
          <li>Payment records: kept as business records.</li>
        </List>
        <p>
          Under Ghana&apos;s Data Protection Act, 2012 (Act 843), you can ask us to tell you what we
          hold about you and give you a copy, correct it, delete it, or stop using it, including
          stopping marketing emails. To ask, email <EmailLink />. You can also contact Ghana&apos;s
          Data Protection Commission.
        </p>
      </Section>

      <Section id="changes" title="Changes to this notice">
        <p>
          We will update this page when what we collect or how we use it changes, and change the
          date below.
        </p>
        <p className="text-[var(--text-primary)] font-medium">Last updated: {LAST_UPDATED}</p>
      </Section>
    </article>
  </div>
);

export default PrivacyPage;
