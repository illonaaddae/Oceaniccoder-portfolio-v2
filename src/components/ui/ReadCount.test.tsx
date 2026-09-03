import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadCount } from "./ReadCount";

describe("ReadCount", () => {
  it("leads with unique readers", () => {
    render(<ReadCount readers={142} reads={318} />);
    expect(screen.getByText("142 readers")).toBeInTheDocument();
  });

  it("puts exact readers and total reads in the tooltip", () => {
    render(<ReadCount readers={142} reads={318} />);
    expect(screen.getByTitle("142 readers · 318 total reads")).toBeInTheDocument();
  });

  it("omits total reads from the tooltip when nobody has re-read", () => {
    render(<ReadCount readers={3} reads={3} />);
    expect(screen.getByTitle("3 readers")).toBeInTheDocument();
  });

  it("uses the singular for a single reader", () => {
    render(<ReadCount readers={1} reads={1} />);
    expect(screen.getByText("1 reader")).toBeInTheDocument();
  });

  it("renders the number alone in compact mode", () => {
    render(<ReadCount readers={1200} reads={1500} compact />);
    expect(screen.getByText("1.2k")).toBeInTheDocument();
  });
});
