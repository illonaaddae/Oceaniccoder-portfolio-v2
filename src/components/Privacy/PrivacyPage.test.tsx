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
    expect(within(visiting).getByText("We use no cookies.")).toBeInTheDocument();
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
    for (const name of ["Microsoft Azure", "Appwrite", "Paystack", "Resend", "OpenAI"]) {
      expect(within(processors).getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByText("Last updated: 13 October 2026")).toBeInTheDocument();
  });

  it("does not claim registration with the Data Protection Commission", () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/registered/i);
  });

  // Turnstile only runs when VITE_DATA_BACKEND=cosmos, which production doesn't set.
  it("does not claim a spam check the live site doesn't run", () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/turnstile|cloudflare/i);
  });

  it("says form data is stored with Appwrite", () => {
    renderPage();
    const processors = screen.getByRole("region", {
      name: "Where your data is stored and who processes it",
    });
    expect(
      within(processors).getByText(/stored with Appwrite and Microsoft Azure/),
    ).toBeInTheDocument();
    expect(within(processors).getByText(/through the site's forms/)).toBeInTheDocument();
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
