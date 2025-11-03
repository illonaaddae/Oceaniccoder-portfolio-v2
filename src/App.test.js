import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Oceaniccoder headings", () => {
  render(<App />);
  const headings = screen.getAllByRole("heading", { name: /oceaniccoder/i });
  expect(headings.length).toBeGreaterThan(0);
  headings.forEach((heading) => {
    expect(heading).toBeInTheDocument();
  });
});
