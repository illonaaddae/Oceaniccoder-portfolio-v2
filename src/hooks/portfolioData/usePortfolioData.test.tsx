import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getProjects = vi.fn();
const getFeaturedProjects = vi.fn();
const getCertifications = vi.fn();
const getSkills = vi.fn();
const getEducation = vi.fn();
const getGallery = vi.fn();
const getJourney = vi.fn();
const getAbout = vi.fn();
const getBlogPosts = vi.fn();

vi.mock("@/services/api", () => ({
  getProjects: (...a: unknown[]) => getProjects(...a),
  getFeaturedProjects: (...a: unknown[]) => getFeaturedProjects(...a),
  getCertifications: (...a: unknown[]) => getCertifications(...a),
  getSkills: (...a: unknown[]) => getSkills(...a),
  getEducation: (...a: unknown[]) => getEducation(...a),
  getGallery: (...a: unknown[]) => getGallery(...a),
  getJourney: (...a: unknown[]) => getJourney(...a),
  getAbout: (...a: unknown[]) => getAbout(...a),
  getBlogPosts: (...a: unknown[]) => getBlogPosts(...a),
}));

const { usePortfolioData } = await import("./usePortfolioData");
const { useProjects } = await import("./individualHooks");

function Consumer({ label }: { label: string }) {
  const { projects, loading } = usePortfolioData();
  return <div data-testid={label}>{loading ? "loading" : `projects:${projects.length}`}</div>;
}

function IndividualConsumer() {
  const { projects } = useProjects();
  return <div data-testid="individual">projects:{projects.length}</div>;
}

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  getProjects.mockResolvedValue([{ $id: "1", title: "One", featured: true }]);
  getFeaturedProjects.mockResolvedValue([{ $id: "1", title: "One", featured: true }]);
  getCertifications.mockResolvedValue([{ $id: "c1" }]);
  getSkills.mockResolvedValue([{ $id: "s1" }]);
  getEducation.mockResolvedValue([{ $id: "e1" }]);
  getGallery.mockResolvedValue([{ $id: "g1", isPublic: true }]);
  getJourney.mockResolvedValue([{ $id: "j1" }]);
  getAbout.mockResolvedValue({ $id: "a1" });
  getBlogPosts.mockResolvedValue([{ $id: "b1" }]);
});

describe("usePortfolioData", () => {
  it("fetches each resource once no matter how many components ask for it", async () => {
    wrap(
      <>
        <Consumer label="a" />
        <Consumer label="b" />
        <Consumer label="c" />
        <IndividualConsumer />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("projects:1"));

    // Four components mounted in the same tick — previously each ran its own
    // nine-request fan-out, because the old cache could not dedupe requests
    // that were still in flight.
    expect(getProjects).toHaveBeenCalledTimes(1);
    expect(getSkills).toHaveBeenCalledTimes(1);
    expect(getAbout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("individual")).toHaveTextContent("projects:1");
  });

  it("serves cached data to a later consumer without refetching", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 60_000 } },
    });

    const first = render(
      <QueryClientProvider client={client}>
        <Consumer label="a" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("projects:1"));
    first.unmount();

    render(
      <QueryClientProvider client={client}>
        <Consumer label="b" />
      </QueryClientProvider>,
    );

    // Cached data paints immediately — no loading state, no second request.
    expect(screen.getByTestId("b")).toHaveTextContent("projects:1");
    expect(getProjects).toHaveBeenCalledTimes(1);
  });

  it("falls back to bundled content when a resource fails", async () => {
    getProjects.mockRejectedValue(new Error("Appwrite down"));

    wrap(<Consumer label="a" />);

    await waitFor(() => expect(screen.getByTestId("a")).not.toHaveTextContent("loading"));
    // Static fallback content, not an empty list.
    expect(screen.getByTestId("a")).not.toHaveTextContent("projects:0");
  });
});
