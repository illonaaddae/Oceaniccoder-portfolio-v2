import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterPills } from "./FilterPills";

describe("FilterPills", () => {
  it("says which pill is selected, not only by colour", async () => {
    const onChange = vi.fn();
    render(
      <FilterPills
        tabs={[
          { key: "all", label: "All" },
          { key: "paid", label: "Paid", count: 3 },
        ]}
        active="all"
        onChange={onChange}
        theme="light"
      />,
    );
    expect(screen.getByRole("button", { name: "All", pressed: true })).toBeInTheDocument();
    const paid = screen.getByRole("button", { name: /^Paid/, pressed: false });
    await userEvent.click(paid);
    expect(onChange).toHaveBeenCalledWith("paid");
  });
});
