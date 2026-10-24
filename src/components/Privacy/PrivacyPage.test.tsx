import { describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import PrivacyPage from "./PrivacyPage";
import Copyright from "../Footer/Copyright";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/privacy"]}>
        <PrivacyPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("PrivacyPage", () => {
  it("has one h1 and a section heading for each topic", () => {
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const sections = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(sections).toEqual([
      "Who we are",
      "When you visit the site",
      "Forms you fill in",
      "Quotes and payments",
      "Emails and text messages",
      "Chat assistant",
      "Blog reads and reactions",
      "Where your data is stored and who processes it",
      "How long we keep data, and your rights",
      "Changes to this notice",
    ]);
  });

  it("gives a working contact email", () => {
    renderPage();
    const who = screen.getByRole("region", { name: "Who we are" });
    expect(within(who).getByRole("link", { name: "hello@oceaniccoder.dev" })).toHaveAttribute(
      "href",
      "mailto:hello@oceaniccoder.dev",
    );
  });

  it("states the analytics promises", () => {
    renderPage();
    const visiting = screen.getByRole("region", { name: "When you visit the site" });
    expect(
      within(visiting).getByText(/We use no tracking or advertising cookies/),
    ).toBeInTheDocument();
    expect(within(visiting).getByText(/don't store your IP address/)).toBeInTheDocument();
    expect(within(visiting).getByText(/deleted automatically after 90 days/)).toBeInTheDocument();
    expect(
      within(visiting).getByText(/Do Not Track or Global Privacy Control/),
    ).toBeInTheDocument();
    expect(within(visiting).getByText(/quotes, payment pages and receipts/)).toBeInTheDocument();
  });

  it("names Act 843, the processors and the last-updated date", () => {
    renderPage();
    expect(screen.getByText(/Data Protection Act, 2012 \(Act 843\)/)).toBeInTheDocument();
    const processors = screen.getByRole("region", {
      name: "Where your data is stored and who processes it",
    });
    for (const name of ["Microsoft Azure", "Cloudflare", "Paystack", "Resend", "OpenAI"]) {
      expect(within(processors).getByText(name)).toBeInTheDocument();
    }
    expect(within(processors).queryByText("Appwrite")).not.toBeInTheDocument();
    expect(screen.getByText("Last updated: 24 October 2026")).toBeInTheDocument();
  });

  it("does not claim registration with the Data Protection Commission", () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/registered/i);
  });

  // Every visitor form sends a Turnstile token that /api/submit checks with
  // Cloudflare, so the notice must say so, and say it only where it happens.
  it("discloses the Turnstile spam check, what it sends and that the IP isn't saved", () => {
    renderPage();
    const forms = screen.getByRole("region", { name: "Forms you fill in" });
    expect(
      within(forms).getByText(
        /contact, booking, inquiry, comment and testimonial forms use Cloudflare\s+Turnstile/,
      ),
    ).toBeInTheDocument();
    expect(
      within(forms).getByText(/sends the result and your IP\s+address to Cloudflare/),
    ).toBeInTheDocument();
    // Turnstile contacts Cloudflare before the form is sent, not only on send.
    expect(
      within(forms).getByText(/Before you send one of these forms, your browser loads Turnstile/),
    ).toBeInTheDocument();
    expect(within(forms).getByText(/and never saves it/)).toBeInTheDocument();
    const processors = screen.getByRole("region", {
      name: "Where your data is stored and who processes it",
    });
    expect(within(processors).getByText(/runs the spam check/)).toBeInTheDocument();
    // Pinned counts. Turnstile: twice in the forms section, once in the
    // processor list. Cloudflare: three times in the forms section, once in
    // front of Paystack's checkout, and twice in the processor section (the
    // list and the transfers). A new mention needs a matching change in the code.
    expect(processors.textContent).toMatch(
      /Email hello@oceaniccoder\.dev to ask how these transfers are protected/,
    );
    expect(document.body.textContent?.match(/turnstile/gi)).toHaveLength(3);
    expect(document.body.textContent?.match(/cloudflare/gi)).toHaveLength(6);
    const quotes = screen.getByRole("region", { name: "Quotes and payments" });
    expect(
      within(quotes).getByText(/Cloudflare, which\s+protects Paystack's servers/),
    ).toBeInTheDocument();
  });

  it("says where Azure stores each kind of data and names the transfer countries", () => {
    renderPage();
    const processors = screen.getByRole("region", {
      name: "Where your data is stored and who processes it",
    });
    expect(
      within(processors).getByText(
        /payment records and page-view records are kept in Azure Cosmos DB in\s+its Central US region, in the United States/,
      ),
    ).toBeInTheDocument();
    expect(
      within(processors).getByText(
        /uploaded photos\s+are kept in Azure Blob Storage in its West Europe region, in the Netherlands/,
      ),
    ).toBeInTheDocument();
    expect(within(processors).getByText(/through the site's forms/)).toBeInTheDocument();
    expect(within(processors).getByText(/Appwrite in Frankfurt,\s+Germany/)).toBeInTheDocument();
    expect(
      within(processors).getByText(
        /Microsoft Azure stores it in\s+the United States and the Netherlands\. Cloudflare, Resend, OpenAI, Google, YouTube, Loom\s+and Zoom are based in the United States, Paystack in Nigeria and Africa's Talking in\s+Kenya/,
      ),
    ).toBeInTheDocument();
  });

  it("says contact messages are emailed to us through Resend, with nothing sent back", () => {
    renderPage();
    const forms = screen.getByRole("region", { name: "Forms you fill in" });
    expect(within(forms).getByText(/email them to ourselves through\s+Resend/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/web3forms/i);
    const email = screen.getByRole("region", { name: "Emails and text messages" });
    expect(
      within(email).getByText(/alerts of new messages we send to ourselves/),
    ).toBeInTheDocument();
    expect(within(email).getByText(/don't track whether you open our emails/)).toBeInTheDocument();
  });

  it("promises commenters' emails stay private, without a hedge", () => {
    renderPage();
    const forms = screen.getByRole("region", { name: "Forms you fill in" });
    expect(
      within(forms).getByText(/never shown publicly or sent to other visitors/),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/leave it blank/i);
  });

  it("lists the testimonial form's fields and that submissions wait for approval", () => {
    renderPage();
    const forms = screen.getByRole("region", { name: "Forms you fill in" });
    expect(within(forms).getByText(/rating and an optional photo/)).toBeInTheDocument();
    expect(within(forms).getByText(/stay off the site until we approve them/)).toBeInTheDocument();
  });

  it("describes the quote sign-in cookie and code, and never says no cookies", () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/no cookies/i);
    const quotes = screen.getByRole("region", { name: "Quotes and payments" });
    expect(
      within(quotes).getByText(/email a 6-digit code to the address on the/),
    ).toBeInTheDocument();
    expect(within(quotes).getByText(/signed in to that quote for 30 days/)).toBeInTheDocument();
    expect(within(quotes).getByText(/revised or its link is replaced/)).toBeInTheDocument();
    expect(
      within(quotes).getByText(/wrong codes are kept until the quote is\s+revised/),
    ).toBeInTheDocument();
    expect(
      within(quotes).getByText(/code requests and code entries are deleted within two days/),
    ).toBeInTheDocument();
    expect(within(quotes).getByText(/IP address is used in\s+memory/)).toBeInTheDocument();
    expect(within(quotes).getByText(/random\s+marker, kept for up to 47 days/)).toBeInTheDocument();
    expect(
      within(quotes).getByText(/Cloudflare, which\s+protects Paystack's servers/),
    ).toBeInTheDocument();
    const visiting = screen.getByRole("region", { name: "When you visit the site" });
    expect(
      within(visiting).getByText(/reference to that code in session storage/),
    ).toBeInTheDocument();
  });

  it("sets the document title", async () => {
    renderPage();
    await waitFor(() => expect(document.title).toBe("Privacy · OceanicCoder"));
  });
});

describe("Footer copyright", () => {
  it("links to the privacy notice", () => {
    render(
      <MemoryRouter>
        <Copyright />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });
});
