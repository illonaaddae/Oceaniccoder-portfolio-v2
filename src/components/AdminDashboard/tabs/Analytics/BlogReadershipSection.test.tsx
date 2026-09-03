import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getBlogPosts = vi.fn();
const getAllBlogViewStats = vi.fn();

vi.mock("@/services/api/blog", () => ({ getBlogPosts: () => getBlogPosts() }));
vi.mock("@/services/api/blogViews", () => ({ getAllBlogViewStats: () => getAllBlogViewStats() }));

const { BlogReadershipSection } = await import("./BlogReadershipSection");

const posts = [
  { $id: "p1", title: "Breaking Barriers" },
  { $id: "p2", title: "Hard Parts of JS" },
  { $id: "p3", title: "Nobody Read This" },
];

describe("BlogReadershipSection", () => {
  beforeEach(() => {
    getBlogPosts.mockReset();
    getAllBlogViewStats.mockReset();
    getBlogPosts.mockResolvedValue(posts);
  });

  it("totals readers and reads across every post", async () => {
    getAllBlogViewStats.mockResolvedValue({
      p1: { readers: 88, reads: 120 },
      p2: { readers: 61, reads: 61 },
    });

    render(<BlogReadershipSection theme="dark" />);

    await waitFor(() => expect(screen.getByText("Unique readers")).toBeInTheDocument());
    expect(screen.getByText("149")).toBeInTheDocument(); // 88 + 61 readers
    expect(screen.getByText("181")).toBeInTheDocument(); // 120 + 61 reads
    expect(screen.getByText("50")).toBeInTheDocument(); // 149 / 3 posts, rounded
  });

  it("ranks posts by unique readers, most read first", async () => {
    getAllBlogViewStats.mockResolvedValue({
      p1: { readers: 61, reads: 61 },
      p2: { readers: 88, reads: 90 },
    });

    render(<BlogReadershipSection theme="dark" />);

    await waitFor(() => expect(screen.getByText(/Hard Parts of JS/)).toBeInTheDocument());
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toContain("Hard Parts of JS");
    expect(items[1]).toContain("Breaking Barriers");
  });

  it("explains the empty state when nothing has been read", async () => {
    getAllBlogViewStats.mockResolvedValue({});

    render(<BlogReadershipSection theme="dark" />);

    await waitFor(() => expect(screen.getByText(/No reads recorded yet/)).toBeInTheDocument());
  });
});
