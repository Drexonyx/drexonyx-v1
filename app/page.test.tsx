import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page", () => {
  it("renders the main hero heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders a link to start a campaign", () => {
    render(<Home />);
    const links = screen.getAllByRole("link", { name: /start.*campaign/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it("renders a link to how it works", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /how it works/i })).toBeInTheDocument();
  });

  it("renders a link to services", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /services/i })).toBeInTheDocument();
  });
});
