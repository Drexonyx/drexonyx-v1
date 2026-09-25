import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ServicesPage from "../services/page";
import HowItWorksPage from "../how-it-works/page";
import PortfolioPage from "../portfolio/page";
import PricingPage from "../pricing/page";
import AboutPage from "../about/page";
import StartCampaignPage from "../start-project/page";
import CheckoutPage from "../checkout/page";

// Credit packages — the checkout page fetches these from the DB.
// Factory is hoisted, so data is inlined directly (no top-level const).
vi.mock('@/lib/credits/packages', () => ({
  getActiveCreditPackages: vi.fn().mockResolvedValue([
    { id: 'pkg-starter', name: 'Starter', credits: 500, price_aed: '499.0000', display_order: 0 },
    { id: 'pkg-value', name: 'Value', credits: 1000, price_aed: '899.0000', display_order: 1 },
    { id: 'pkg-growth', name: 'Growth', credits: 2500, price_aed: '1999.0000', display_order: 2 },
  ]),
  getCreditPackageById: vi.fn().mockResolvedValue(null),
}));

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
  it("renders an h1 heading", async () => {
    render(await PricingPage());
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders credit packages from DB", async () => {
    render(await PricingPage());
    // "Value" is unique to the DB mock packages (not in PRODUCTION_PACKAGES)
    expect(screen.getByText("Value")).toBeInTheDocument();
    // "Growth" appears in both DB packages and PRODUCTION_PACKAGES — check count
    expect(screen.getAllByText("Growth").length).toBeGreaterThanOrEqual(1);
  });

  it("renders production services with credit costs", async () => {
    render(await PricingPage());
    expect(screen.getByText("Spark")).toBeInTheDocument();
    expect(screen.getByText("2,500 Credits")).toBeInTheDocument();
    expect(screen.getByText("17,500 Credits")).toBeInTheDocument();
  });

  it("renders creative direction services with credit costs", async () => {
    render(await PricingPage());
    expect(screen.getByText("Micro Creative")).toBeInTheDocument();
    expect(screen.getByText("Creative Brief")).toBeInTheDocument();
    expect(screen.getByText("1,000 Credits")).toBeInTheDocument();
    expect(screen.getByText("1,500 Credits")).toBeInTheDocument();
  });

  it("renders custom tiers", async () => {
    render(await PricingPage());
    expect(screen.getByText("Brand Film")).toBeInTheDocument();
    expect(screen.getByText("Custom Project")).toBeInTheDocument();
  });

  it("renders AED prices for credit packages", async () => {
    render(await PricingPage());
    expect(screen.getByText("AED 499")).toBeInTheDocument();
    expect(screen.getByText("AED 1,999")).toBeInTheDocument();
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
  it("renders a Buy Credits h1 heading", async () => {
    render(await CheckoutPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/buy credits/i);
  });

  it("renders the proceed to payment button when packages are available", async () => {
    render(await CheckoutPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("button", { name: /proceed to payment/i })).toBeInTheDocument();
  });

  it("renders all mock credit package names", async () => {
    render(await CheckoutPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByText("Starter").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Value").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Growth").length).toBeGreaterThan(0);
  });

  it("shows Starter package with AED 499 price", async () => {
    render(await CheckoutPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByText("Starter").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AED 499").length).toBeGreaterThan(0);
  });

  it("shows 500 credits label for Starter package", async () => {
    render(await CheckoutPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByText(/500 credits/i).length).toBeGreaterThan(0);
  });

  it("pre-selects the smallest DB package covering the service credit cost", async () => {
    // service=spark needs 2,500 credits; mock pkg-growth has exactly 2,500 → selected
    render(await CheckoutPage({ searchParams: Promise.resolve({ service: "spark" }) }));
    const radios = screen.getAllByRole("radio");
    const growthRadio = radios.find(
      (r) => (r as HTMLInputElement).value === "pkg-growth"
    );
    expect(growthRadio).toBeDefined();
    expect(growthRadio as HTMLInputElement).toBeChecked();
  });

  it("selects the correct package when service needs fewer credits than top tier", async () => {
    // service=micro-creative needs 1,000 credits; pkg-value (1,000) is the smallest match
    render(await CheckoutPage({ searchParams: Promise.resolve({ service: "micro-creative" }) }));
    const radios = screen.getAllByRole("radio");
    const valueRadio = radios.find(
      (r) => (r as HTMLInputElement).value === "pkg-value"
    );
    expect(valueRadio).toBeDefined();
    expect(valueRadio as HTMLInputElement).toBeChecked();
  });

  it("defaults to first package when service needs more credits than any DB package covers", async () => {
    // service=production needs 72,500 credits; mock max is 2,500 → no match → first package
    render(await CheckoutPage({ searchParams: Promise.resolve({ service: "production" }) }));
    const radios = screen.getAllByRole("radio");
    const starterRadio = radios.find(
      (r) => (r as HTMLInputElement).value === "pkg-starter"
    );
    expect(starterRadio).toBeDefined();
    expect(starterRadio as HTMLInputElement).toBeChecked();
  });

  it("defaults to first package when service identifier is unknown", async () => {
    render(await CheckoutPage({ searchParams: Promise.resolve({ service: "nonexistent-service" }) }));
    const radios = screen.getAllByRole("radio");
    const starterRadio = radios.find(
      (r) => (r as HTMLInputElement).value === "pkg-starter"
    );
    expect(starterRadio).toBeDefined();
    expect(starterRadio as HTMLInputElement).toBeChecked();
  });

  it("shows no packages state when credit packages list is empty", async () => {
    const { getActiveCreditPackages } = await import('@/lib/credits/packages');
    vi.mocked(getActiveCreditPackages).mockResolvedValueOnce([]);
    render(await CheckoutPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/no packages available/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /proceed to payment/i })).not.toBeInTheDocument();
  });
});
