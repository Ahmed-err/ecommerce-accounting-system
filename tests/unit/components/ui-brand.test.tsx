import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

describe("ui on brand tokens", () => {
  it("default buttons are 44px tall with navy text on amber", () => {
    const cls = buttonVariants();
    expect(cls).toContain("h-11");
    expect(cls).toContain("bg-primary");
    expect(cls).toContain("text-primary-foreground");
    expect(cls).not.toMatch(/rounded-(full|2xl|3xl)/);
  });

  it("offers a navy brand button and keeps old variants", () => {
    expect(buttonVariants({ variant: "brand" })).toContain("bg-brand");
    for (const v of ["outline", "secondary", "ghost", "destructive", "link"] as const) {
      expect(buttonVariants({ variant: v })).toBeTruthy();
    }
    expect(buttonVariants({ variant: "link" })).toContain("text-accent-text");
  });

  it("badges have status variants", () => {
    render(<Badge variant="success">متوفر</Badge>);
    expect(screen.getByText("متوفر").className).toContain("text-success");
  });

  it("numeric inputs are LTR with tabular digits and 16px text", () => {
    render(<Input numeric aria-label="phone" />);
    const input = screen.getByLabelText("phone");
    expect(input).toHaveAttribute("dir", "ltr");
    expect(input.className).toContain("tabular-nums");
    expect(input.className).toContain("h-11");
    expect(input.className).not.toContain("md:text-sm");
  });

  it("still renders a Button", () => {
    render(<Button>حفظ</Button>);
    expect(screen.getByRole("button", { name: "حفظ" })).toBeInTheDocument();
  });
});
