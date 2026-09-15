import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ServicesPage from "../services/page";
import HowItWorksPage from "../how-it-works/page";
import PortfolioPage from "../portfolio/page";
import PricingPage from "../pricing/page";
import AboutPage from "../about/page";
import StartCampaignPage from "../start-project/page";
import CheckoutPage from "../checkout/page";

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

  it("has a start project link", () => {
    render(<ServicesPage />);
    expect(screen.getByRole("link", { name: /start project/i })).toBeInTheDocument();
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

  it("renders portfolio items", () => {
    render(<PortfolioPage />);
    expect(screen.getByText("Performance Creative — Demo Reel")).toBeInTheDocument();
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

  it("renders all five production package cards", () => {
    render(<PricingPage />);
    expect(screen.getByText("Spark")).toBeInTheDocument();
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Scale")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
  });

  it("renders the two micro entry products", () => {
    render(<PricingPage />);
    expect(screen.getByText("Micro Creative")).toBeInTheDocument();
    expect(screen.getByText("Creative Brief")).toBeInTheDocument();
  });

  it("renders custom tiers", () => {
    render(<PricingPage />);
    expect(screen.getByText("Brand Film")).toBeInTheDocument();
    expect(screen.getByText("Enterprise & Custom")).toBeInTheDocument();
  });

  it("renders AED prices", () => {
    render(<PricingPage />);
    expect(screen.getByText("AED 499")).toBeInTheDocument();
    expect(screen.getByText("AED 3,500")).toBeInTheDocument();
  });

  it("marks Growth as Most Popular", () => {
    render(<PricingPage />);
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
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

describe("Start Project page", () => {
  it("renders an h1 heading", () => {
    render(<StartCampaignPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the intake form", () => {
    render(<StartCampaignPage />);
    expect(screen.getByRole("form", { name: /campaign brief intake form/i })).toBeInTheDocument();
  });

  it("continue button is enabled on step 1", () => {
    render(<StartCampaignPage />);
    expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled();
  });

  it("renders platform options as enabled checkboxes", () => {
    render(<StartCampaignPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    checkboxes.forEach((cb) => expect(cb).not.toBeDisabled());
  });

  it("renders creative type options on step 1", () => {
    render(<StartCampaignPage />);
    expect(screen.getByText("UGC Video Ads")).toBeInTheDocument();
    expect(screen.getByText("Static Ad Creative")).toBeInTheDocument();
  });
});

describe("Checkout page", () => {
  it("renders an h1 heading", () => {
    render(<CheckoutPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the proceed to payment button", () => {
    render(<CheckoutPage />);
    expect(screen.getByRole("button", { name: /proceed to payment/i })).toBeInTheDocument();
  });
});
