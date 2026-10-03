"use client";

import { Plus } from "lucide-react";
import BoltMark from "@/components/brand/BoltMark";
import BrandLockup from "@/components/brand/BrandLockup";
import DeveloperCredit from "@/components/brand/DeveloperCredit";
import Price from "@/components/brand/Price";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";

const SWATCHES = [
  "background",
  "card",
  "primary",
  "brand",
  "secondary",
  "muted",
  "success",
  "destructive",
  "info",
  "warning",
  "accent-text",
  "border",
];
const TYPE = ["type-display", "type-h1", "type-h2", "type-h3", "type-body", "type-small", "type-caption"];
const BUTTON_VARIANTS = ["default", "brand", "outline", "secondary", "ghost", "destructive", "link"];
const BADGE_VARIANTS = ["default", "secondary", "success", "info", "warning", "destructive", "neutral", "outline"];

function Section({ title, children }) {
  return (
    <section className="space-y-4 border-t border-border py-8">
      <h2 className="type-h2">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguideClient() {
  const { setLang } = useLanguage();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3 pb-6">
        <h1 className="type-h1 me-auto">Himmat — style guide</h1>
        <Button variant="outline" size="sm" onClick={() => setLang("ar")}>العربية</Button>
        <Button variant="outline" size="sm" onClick={() => setLang("en")}>English</Button>
        <ThemeToggle />
      </div>

      <Section title="Logo">
        <div className="flex flex-wrap items-center gap-8">
          <BrandLockup variant="full" />
          <BrandLockup variant="compact" />
          <BrandLockup variant="mark" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {[24, 32, 56].map((size) => (
            <BoltMark key={`n${size}`} size={size} />
          ))}
          {[24, 32, 56].map((size) => (
            <BoltMark key={`a${size}`} size={size} tone="amber" />
          ))}
        </div>
      </Section>

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map((name) => (
            <div key={name} className="space-y-1">
              <div className="h-12 rounded-lg border border-border" style={{ background: `var(--${name})` }} />
              <p className="text-xs text-muted-foreground" dir="ltr">--{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        {TYPE.map((cls) => (
          <div key={cls} className="flex flex-wrap items-baseline gap-4 border-b border-border pb-2">
            <span className="w-28 text-xs text-muted-foreground" dir="ltr">{cls}</span>
            <span className={cls}>قاطع كهربائي 32 أمبير</span>
          </div>
        ))}
      </Section>

      <Section title="Buttons">
        {BUTTON_VARIANTS.map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-xs text-muted-foreground" dir="ltr">{variant}</span>
            <Button variant={variant} size="sm">حفظ</Button>
            <Button variant={variant}>اشترِ الآن</Button>
            <Button variant={variant} size="lg">أضف إلى السلة</Button>
            <Button variant={variant} size="icon" aria-label="أضف">
              <Plus />
            </Button>
          </div>
        ))}
      </Section>

      <Section title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input placeholder="الاسم الكامل" aria-label="الاسم الكامل" />
          <Input numeric defaultValue="0912345678" aria-label="رقم الهاتف" />
          <Input disabled placeholder="معطل" aria-label="معطل" />
          <Input aria-invalid="true" defaultValue="خطأ" aria-label="حقل به خطأ" />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-3">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>{variant}</Badge>
          ))}
        </div>
      </Section>

      <Section title="Card + price">
        <Card className="max-w-xs">
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">قواطع · CB-32A</span>
              <Badge variant="success">متوفر</Badge>
            </div>
            <p className="font-bold">قاطع كهربائي 32 أمبير أحادي القطب</p>
            <div className="flex items-center justify-between">
              <Price amount={1250} compareAt={1400} />
              <Button size="icon" aria-label="أضف إلى السلة">
                <Plus />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Footer credit">
        <DeveloperCredit />
      </Section>
    </main>
  );
}
