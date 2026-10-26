import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import ContactInfoCard from "./ContactInfoCard";

const renderCard = () =>
  render(
    <MemoryRouter>
      <ContactInfoCard />
    </MemoryRouter>,
  );

describe("ContactInfoCard", () => {
  it("offers a booked call instead of a phone number", () => {
    renderCard();
    const book = screen.getByRole("link", { name: /book a call/i });
    expect(book).toHaveAttribute("href", "/booking");
    expect(screen.queryByText(/\+233/)).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it("keeps the email link", () => {
    renderCard();
    expect(screen.getByRole("link", { name: /hello@oceaniccoder\.dev/i })).toHaveAttribute(
      "href",
      "mailto:hello@oceaniccoder.dev",
    );
  });
});
