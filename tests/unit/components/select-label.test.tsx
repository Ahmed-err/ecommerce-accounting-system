import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

describe("Select", () => {
  it("shows the selected item's label, not its raw value", () => {
    const rows = [{ id: "c1", name: "مفاتيح" }];
    render(
      <Select value="all">
        <SelectTrigger data-testid="trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          {rows.map((r) => (
            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
    expect(screen.getByTestId("trigger").textContent).toContain("الكل");
    expect(screen.getByTestId("trigger").textContent).not.toContain("all");
  });

  it("keeps an explicit items map", () => {
    render(
      <Select value="ar" items={{ ar: "العربية" }}>
        <SelectTrigger data-testid="trigger"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="ar">x</SelectItem></SelectContent>
      </Select>
    );
    expect(screen.getByTestId("trigger").textContent).toContain("العربية");
  });
});
