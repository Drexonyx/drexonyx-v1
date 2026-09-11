import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ServicesPage from "../services/page";
import HowItWorksPage from "../how-it-works/page";
import PortfolioPage from "../portfolio/page";
import PricingPage from "../pricing/page";
import AboutPage from "../about/page";
import StartCampaignPage from "../start-campaign/page";

describe("Services page", () => {
  it("renders an h1 heading", () => {
    render(<ServicesPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders all four service entries", () => {
    render(<ServicesPage />);
    expect(screen.getByText("UGC Video Ads")).toBeInTheDocument();
    expect(screen.getByText("Static Ad Creative")).toBeInTheDocument();
    expect(screen.getByText("Creative Strategy")).toBeInTheDocument();
    expect(screen.getByText("Campaign QC")).toBeInTheDocument();
  });

  it("has a start campaign link", () => {
    render(<ServicesPage />);
    expect(screen.getByRole("link", { name: /start.*campaign/i })).toBeInTheDocument();
  });
});

describe("How It Works page", () => {
  it("renders an h1 heading", () => {
    render(<HowItWorksPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders all five process steps", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText("Campaign Brief")).toBeInTheDocument();
    expect(screen.getByText("Creative Strategy")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("Quality Control")).toBeInTheDocument();
    expect(screen.getByText("Delivery")).toBeInTheDocument();
  });
});

describe("Portfolio page", () => {
  it("renders an h1 heading", () => {
    render(<PortfolioPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders a notice that portfolio is actively updated", () => {
    render(<PortfolioPage />);
    expect(screen.getByText(/portfolio is actively updated/i)).toBeInTheDocument();
  });

  it("renders category filter buttons", () => {
    render(<PortfolioPage />);
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "UGC Video" })).toBeInTheDocument();
  });
});

describe("Pricing page", () => {
  it("renders an h1 heading", () => {
    render(<PricingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the pricing-in-development notice", () => {
    render(<PricingPage />);
    expect(screen.getByText(/pricing in development/i)).toBeInTheDocument();
  });

  it("renders package cards", () => {
    render(<PricingPage />);
    const cards = screen.getAllByText(/PLACEHOLDER — .* Package/);
    expect(cards.length).toBe(3);
  });
});

describe("About page", () => {
  it("renders an h1 heading", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the Why We Exist section", () => {
    render(<AboutPage />);
    expect(screen.getByText("Why We Exist")).toBeInTheDocument();
  });

  it("renders all four value cards", () => {
    render(<AboutPage />);
    expect(screen.getByText("Performance Over Aesthetics")).toBeInTheDocument();
    expect(screen.getByText("Authentic, Not Manufactured")).toBeInTheDocument();
    expect(screen.getByText("Brief Discipline")).toBeInTheDocument();
    expect(screen.getByText("Continuous Improvement")).toBeInTheDocument();
  });

  it("renders the team section", () => {
    render(<AboutPage />);
    expect(screen.getByText(/team profiles will be published/i)).toBeInTheDocument();
  });
});

describe("Start Campaign page", () => {
  it("renders an h1 heading", () => {
    render(<StartCampaignPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the intake form", () => {
    render(<StartCampaignPage />);
    expect(screen.getByRole("form", { name: /campaign brief intake form/i })).toBeInTheDocument();
  });

  it("renders a dev notice that form is not yet active", () => {
    render(<StartCampaignPage />);
    expect(screen.getByText(/intake form in development/i)).toBeInTheDocument();
  });

  it("submit button is disabled", () => {
    render(<StartCampaignPage />);
    expect(screen.getByRole("button", { name: /submit brief/i })).toBeDisabled();
  });

  it("renders platform options as disabled checkboxes", () => {
    render(<StartCampaignPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    checkboxes.forEach((cb) => expect(cb).toBeDisabled());
  });
});
