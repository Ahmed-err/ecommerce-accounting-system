"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSettingsRolesPage, getSettingsUsersPage, updateSettings } from "@/app/actions/settings";

const TABS = ["store", "shipping", "homepage", "about", "payment", "notifications", "seo", "legal", "users", "backup", "system"];

function cloneFromServer(value) {
  if (value == null) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function serializePaymentMethods(methods) {
  if (!Array.isArray(methods)) return [];
  return methods.map((m) => ({
    code: m.code,
    labelAr: m.labelAr,
    labelEn: m.labelEn,
    isEnabled: !!m.isEnabled,
    apiKey: m.apiKey ?? null,
    apiSecret: m.apiSecret ?? null,
    instructionsAr: m.instructionsAr ?? null,
    instructionsEn: m.instructionsEn ?? null,
  }));
}

function toInputString(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v?.toString === "function") return String(v);
  return "";
}

const DEFAULT_NOTIFICATION_CONFIG = {
  emailNewOrderAdmin: true,
  emailOrderStatusCustomer: true,
  emailLowStockAdmin: true,
  emailNewReturnAdmin: true,
  smsWhatsappEnabled: false,
  adminRecipients: "",
};

function normalizeStoreFromServer(store) {
  const s = cloneFromServer(store);
  if (!s.notificationConfig) {
    s.notificationConfig = { ...DEFAULT_NOTIFICATION_CONFIG };
  }
  return s;
}

function formatDateTimeLocal(value) {
  if (!value) return "";
  if (typeof value === "string" && value.includes("T") && value.length >= 16) {
    return value.slice(0, 16);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminSettingsClient({ initialTab, initialData, lang }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState(() => normalizeStoreFromServer(initialData.store));
  const [users, setUsers] = useState(initialData.users || []);
  const [permissions, setPermissions] = useState(initialData.permissions || []);
  const [homepage, setHomepage] = useState({
    banners: initialData.homepage?.banners || [],
    offers: initialData.homepage?.offers || [],
  });
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRoleFilter, setUsersRoleFilter] = useState("all");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState((initialData.users || []).length);
  const [usersLoading, setUsersLoading] = useState(false);
  const [rolesSearch, setRolesSearch] = useState("");
  const [rolesRoleFilter, setRolesRoleFilter] = useState("all");
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesPages, setRolesPages] = useState(1);
  const [rolesTotal, setRolesTotal] = useState((initialData.permissions || []).length);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [legal, setLegal] = useState({
    termsAr: initialData.legal?.terms?.contentAr ?? "",
    termsEn: initialData.legal?.terms?.contentEn ?? "",
    privacyAr: initialData.legal?.privacy?.contentAr ?? "",
    privacyEn: initialData.legal?.privacy?.contentEn ?? "",
  });
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("success");

  const currentTab = searchParams.get("tab") || initialTab;
  const activeTab = TABS.includes(currentTab) ? currentTab : "store";
  const isRTL = lang === "ar";

  useEffect(() => {
    setStore(normalizeStoreFromServer(initialData.store));
    setUsers(initialData.users || []);
    setLegal({
      termsAr: initialData.legal?.terms?.contentAr ?? "",
      termsEn: initialData.legal?.terms?.contentEn ?? "",
      privacyAr: initialData.legal?.privacy?.contentAr ?? "",
      privacyEn: initialData.legal?.privacy?.contentEn ?? "",
    });
    setPermissions(initialData.permissions || []);
    setHomepage({
      banners: initialData.homepage?.banners || [],
      offers: initialData.homepage?.offers || [],
    });
  }, [initialData]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await getSettingsUsersPage({
      page: usersPage,
      take: 10,
      search: usersSearch,
      role: usersRoleFilter,
    });
    if (res?.success) {
      setUsers(res.rows || []);
      setUsersPages(res.pages || 1);
      setUsersTotal(res.total || 0);
    }
    setUsersLoading(false);
  }, [usersPage, usersSearch, usersRoleFilter]);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    const res = await getSettingsRolesPage({
      page: rolesPage,
      take: 10,
      search: rolesSearch,
      role: rolesRoleFilter,
    });
    if (res?.success) {
      setPermissions(res.rows || []);
      setRolesPages(res.pages || 1);
      setRolesTotal(res.total || 0);
    }
    setRolesLoading(false);
  }, [rolesPage, rolesSearch, rolesRoleFilter]);

  useEffect(() => {
    if (activeTab === "users") loadUsers();
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab === "users") loadRoles();
  }, [activeTab, loadRoles]);

  const tabLabel = useMemo(
    () => ({
      store: lang === "ar" ? "المتجر" : "Store",
      about: lang === "ar" ? "من نحن" : "About page",
      homepage: lang === "ar" ? "محتوى الرئيسية" : "Homepage content",
      shipping: lang === "ar" ? "الشحن" : "Shipping",
      payment: lang === "ar" ? "الدفع" : "Payment",
      notifications: lang === "ar" ? "الإشعارات" : "Notifications",
      seo: "SEO",
      legal: lang === "ar" ? "الشروط والخصوصية" : "Legal",
      users: lang === "ar" ? "المستخدمون والصلاحيات" : "Users & Roles",
      backup: lang === "ar" ? "النسخ الاحتياطي" : "Backup",
      system: lang === "ar" ? "النظام" : "System",
    }),
    [lang]
  );

  function switchTab(tab) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", tab);
    router.push(`${pathname}?${p.toString()}`);
  }

  function save(tab, payload) {
    setStatus("");
    setStatusType("success");
    setSaving(true);
    updateSettings({ tab, payload })
      .then((res) => {
        if (res?.success) {
          if (res.data?.store) setStore(normalizeStoreFromServer(res.data.store));
          if (res.data?.users) setUsers(res.data.users);
          if (res.data?.permissions) setPermissions(res.data.permissions);
          if (res.data?.homepage) {
            setHomepage({
              banners: res.data.homepage?.banners || [],
              offers: res.data.homepage?.offers || [],
            });
          }
          if (res.data?.legal) {
            setLegal({
              termsAr: res.data.legal?.terms?.contentAr ?? "",
              termsEn: res.data.legal?.terms?.contentEn ?? "",
              privacyAr: res.data.legal?.privacy?.contentAr ?? "",
              privacyEn: res.data.legal?.privacy?.contentEn ?? "",
            });
          }
          setStatus(lang === "ar" ? "تم الحفظ" : "Saved");
          setStatusType("success");
          toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
          router.refresh();
        } else {
          const msg = res?.error || (lang === "ar" ? "فشل الحفظ" : "Failed");
          setStatus(msg);
          setStatusType("error");
          toast.error(msg);
        }
      })
      .catch((err) => {
        const msg = err?.message || (lang === "ar" ? "فشل الحفظ" : "Save failed");
        setStatus(msg);
        setStatusType("error");
        toast.error(msg);
      })
      .finally(() => setSaving(false));
  }

  return (
    <div className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Button key={tab} variant={activeTab === tab ? "default" : "outline"} size="sm" onClick={() => switchTab(tab)}>
            {tabLabel[tab]}
          </Button>
        ))}
      </div>

      {status && <p className={`text-sm ${statusType === "error" ? "text-red-500" : "text-emerald-500"}`}>{status}</p>}

      {activeTab === "homepage" && (
        <div className="space-y-8">
          <div className="space-y-3 rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{lang === "ar" ? "السلايدر الرئيسي (Banners)" : "Hero banners"}</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setHomepage((p) => ({
                    ...p,
                    banners: [
                      ...p.banners,
                      {
                        id: `new-banner-${Date.now()}`,
                        titleAr: "",
                        titleEn: "",
                        subtitleAr: "",
                        subtitleEn: "",
                        image: "",
                        ctaTextAr: "",
                        ctaTextEn: "",
                        ctaLink: "/products",
                        order: p.banners.length,
                        isActive: true,
                        _isNew: true,
                      },
                    ],
                  }))
                }
              >
                {lang === "ar" ? "إضافة بانر" : "Add banner"}
              </Button>
            </div>

            <div className="space-y-4">
              {homepage.banners.length === 0 ? (
                <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد بانرات حالياً" : "No banners yet"}</p>
              ) : (
                homepage.banners.map((b) => (
                  <div key={b.id} className="rounded-lg border p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input value={b.titleAr || ""} onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, titleAr: e.target.value } : it) }))} placeholder={lang === "ar" ? "العنوان عربي" : "Title AR"} />
                      <Input value={b.titleEn || ""} onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, titleEn: e.target.value } : it) }))} placeholder={lang === "ar" ? "العنوان إنجليزي" : "Title EN"} />
                      <Input value={b.subtitleAr || ""} onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, subtitleAr: e.target.value } : it) }))} placeholder={lang === "ar" ? "وصف قصير عربي" : "Subtitle AR"} />
                      <Input value={b.subtitleEn || ""} onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, subtitleEn: e.target.value } : it) }))} placeholder={lang === "ar" ? "وصف قصير إنجليزي" : "Subtitle EN"} />
                      <Input value={b.image || ""} onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, image: e.target.value } : it) }))} placeholder={lang === "ar" ? "رابط الصورة" : "Image URL"} />
                      <Input value={b.ctaLink || ""} onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, ctaLink: e.target.value } : it) }))} placeholder={lang === "ar" ? "رابط الزر (/products)" : "CTA link (/products)"} />
                      <Input value={b.ctaTextAr || ""} onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, ctaTextAr: e.target.value } : it) }))} placeholder={lang === "ar" ? "نص الزر عربي" : "CTA text AR"} />
                      <Input value={b.ctaTextEn || ""} onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, ctaTextEn: e.target.value } : it) }))} placeholder={lang === "ar" ? "نص الزر إنجليزي" : "CTA text EN"} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        type="number"
                        value={b.order ?? 0}
                        onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, order: e.target.value } : it) }))}
                        placeholder={lang === "ar" ? "الترتيب" : "Order"}
                        className="w-32"
                      />
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!b.isActive}
                          onChange={(e) => setHomepage((p) => ({ ...p, banners: p.banners.map((it) => it.id === b.id ? { ...it, isActive: e.target.checked } : it) }))}
                        />
                        {lang === "ar" ? "نشط" : "Active"}
                      </label>
                      <Button
                        size="sm"
                        disabled={saving}
                        onClick={() =>
                          save("homepage", {
                            type: "banner",
                            action: b._isNew ? "create" : "update",
                            id: b._isNew ? undefined : b.id,
                            titleAr: b.titleAr,
                            titleEn: b.titleEn,
                            subtitleAr: b.subtitleAr,
                            subtitleEn: b.subtitleEn,
                            image: b.image,
                            ctaTextAr: b.ctaTextAr,
                            ctaTextEn: b.ctaTextEn,
                            ctaLink: b.ctaLink,
                            order: Number(b.order) || 0,
                            isActive: !!b.isActive,
                          })
                        }
                      >
                        {lang === "ar" ? "حفظ البانر" : "Save banner"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={saving}
                        onClick={() => {
                          if (b._isNew) {
                            setHomepage((p) => ({ ...p, banners: p.banners.filter((it) => it.id !== b.id) }));
                            return;
                          }
                          save("homepage", { type: "banner", action: "delete", id: b.id });
                        }}
                      >
                        {lang === "ar" ? "حذف" : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{lang === "ar" ? "العروض الخاصة (Offers)" : "Special offers"}</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setHomepage((p) => ({
                    ...p,
                    offers: [
                      ...p.offers,
                      {
                        id: `new-offer-${Date.now()}`,
                        titleAr: "",
                        titleEn: "",
                        subtitleAr: "",
                        subtitleEn: "",
                        image: "",
                        ctaTextAr: "",
                        ctaTextEn: "",
                        ctaLink: "/products",
                        expiresAt: "",
                        isActive: true,
                        _isNew: true,
                      },
                    ],
                  }))
                }
              >
                {lang === "ar" ? "إضافة عرض" : "Add offer"}
              </Button>
            </div>

            <div className="space-y-4">
              {homepage.offers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد عروض حالياً" : "No offers yet"}</p>
              ) : (
                homepage.offers.map((o) => (
                  <div key={o.id} className="rounded-lg border p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input value={o.titleAr || ""} onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, titleAr: e.target.value } : it) }))} placeholder={lang === "ar" ? "عنوان العرض عربي" : "Offer title AR"} />
                      <Input value={o.titleEn || ""} onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, titleEn: e.target.value } : it) }))} placeholder={lang === "ar" ? "عنوان العرض إنجليزي" : "Offer title EN"} />
                      <Input value={o.subtitleAr || ""} onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, subtitleAr: e.target.value } : it) }))} placeholder={lang === "ar" ? "وصف العرض عربي" : "Offer subtitle AR"} />
                      <Input value={o.subtitleEn || ""} onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, subtitleEn: e.target.value } : it) }))} placeholder={lang === "ar" ? "وصف العرض إنجليزي" : "Offer subtitle EN"} />
                      <Input value={o.image || ""} onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, image: e.target.value } : it) }))} placeholder={lang === "ar" ? "رابط صورة العرض" : "Offer image URL"} />
                      <Input value={o.ctaLink || ""} onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, ctaLink: e.target.value } : it) }))} placeholder={lang === "ar" ? "رابط الزر" : "CTA link"} />
                      <Input value={o.ctaTextAr || ""} onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, ctaTextAr: e.target.value } : it) }))} placeholder={lang === "ar" ? "نص الزر عربي" : "CTA text AR"} />
                      <Input value={o.ctaTextEn || ""} onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, ctaTextEn: e.target.value } : it) }))} placeholder={lang === "ar" ? "نص الزر إنجليزي" : "CTA text EN"} />
                      <Input
                        type="datetime-local"
                        value={formatDateTimeLocal(o.expiresAt)}
                        onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, expiresAt: e.target.value } : it) }))}
                        placeholder={lang === "ar" ? "تاريخ الانتهاء" : "Expires at"}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!o.isActive}
                          onChange={(e) => setHomepage((p) => ({ ...p, offers: p.offers.map((it) => it.id === o.id ? { ...it, isActive: e.target.checked } : it) }))}
                        />
                        {lang === "ar" ? "نشط" : "Active"}
                      </label>
                      <Button
                        size="sm"
                        disabled={saving}
                        onClick={() =>
                          save("homepage", {
                            type: "offer",
                            action: o._isNew ? "create" : "update",
                            id: o._isNew ? undefined : o.id,
                            titleAr: o.titleAr,
                            titleEn: o.titleEn,
                            subtitleAr: o.subtitleAr,
                            subtitleEn: o.subtitleEn,
                            image: o.image,
                            ctaTextAr: o.ctaTextAr,
                            ctaTextEn: o.ctaTextEn,
                            ctaLink: o.ctaLink,
                            expiresAt: o.expiresAt,
                            isActive: !!o.isActive,
                          })
                        }
                      >
                        {lang === "ar" ? "حفظ العرض" : "Save offer"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={saving}
                        onClick={() => {
                          if (o._isNew) {
                            setHomepage((p) => ({ ...p, offers: p.offers.filter((it) => it.id !== o.id) }));
                            return;
                          }
                          save("homepage", { type: "offer", action: "delete", id: o.id });
                        }}
                      >
                        {lang === "ar" ? "حذف" : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "about" && (
        <div className="grid grid-cols-1 gap-3">
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "محتوى صفحة من نحن (يظهر في المتجر)." : "About page content shown on the storefront."}</p>
          <textarea
            className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={store.aboutStoryAr || ""}
            onChange={(e) => setStore((p) => ({ ...p, aboutStoryAr: e.target.value }))}
            placeholder={lang === "ar" ? "قصة المتجر (عربي)" : "Our story (AR)"}
          />
          <textarea
            className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={store.aboutStoryEn || ""}
            onChange={(e) => setStore((p) => ({ ...p, aboutStoryEn: e.target.value }))}
            placeholder={lang === "ar" ? "قصة المتجر (إنجليزي)" : "Our story (EN)"}
          />
          <textarea
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={store.aboutMissionAr || ""}
            onChange={(e) => setStore((p) => ({ ...p, aboutMissionAr: e.target.value }))}
            placeholder={lang === "ar" ? "الرسالة (عربي)" : "Mission (AR)"}
          />
          <textarea
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={store.aboutMissionEn || ""}
            onChange={(e) => setStore((p) => ({ ...p, aboutMissionEn: e.target.value }))}
            placeholder={lang === "ar" ? "الرسالة (إنجليزي)" : "Mission (EN)"}
          />
          <textarea
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={store.aboutVisionAr || ""}
            onChange={(e) => setStore((p) => ({ ...p, aboutVisionAr: e.target.value }))}
            placeholder={lang === "ar" ? "الرؤية (عربي)" : "Vision (AR)"}
          />
          <textarea
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={store.aboutVisionEn || ""}
            onChange={(e) => setStore((p) => ({ ...p, aboutVisionEn: e.target.value }))}
            placeholder={lang === "ar" ? "الرؤية (إنجليزي)" : "Vision (EN)"}
          />
          <Input
            value={store.aboutImageUrl || ""}
            onChange={(e) => setStore((p) => ({ ...p, aboutImageUrl: e.target.value }))}
            placeholder={lang === "ar" ? "رابط صورة المتجر (Cloudinary)" : "Store photo URL (Cloudinary)"}
          />
          <Input
            type="number"
            value={store.aboutFoundedYear != null ? String(store.aboutFoundedYear) : ""}
            onChange={(e) =>
              setStore((p) => ({
                ...p,
                aboutFoundedYear: e.target.value === "" ? null : e.target.value,
              }))
            }
            placeholder={lang === "ar" ? "سنة التأسيس (لحساب سنوات العمل)" : "Founded year (for years in business)"}
          />
          <Button
            disabled={saving}
            onClick={() =>
              save("about", {
                aboutStoryAr: store.aboutStoryAr,
                aboutStoryEn: store.aboutStoryEn,
                aboutMissionAr: store.aboutMissionAr,
                aboutMissionEn: store.aboutMissionEn,
                aboutVisionAr: store.aboutVisionAr,
                aboutVisionEn: store.aboutVisionEn,
                aboutImageUrl: store.aboutImageUrl,
                aboutFoundedYear: store.aboutFoundedYear,
              })
            }
          >
            {saving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : lang === "ar" ? "حفظ صفحة من نحن" : "Save About page"}
          </Button>
        </div>
      )}

      {activeTab === "store" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input value={store.nameAr || ""} onChange={(e) => setStore((p) => ({ ...p, nameAr: e.target.value }))} placeholder={lang === "ar" ? "اسم المتجر (عربي)" : "Store name (AR)"} />
          <Input value={store.nameEn || ""} onChange={(e) => setStore((p) => ({ ...p, nameEn: e.target.value }))} placeholder={lang === "ar" ? "اسم المتجر (إنجليزي)" : "Store name (EN)"} />
          <Input value={store.sloganAr || ""} onChange={(e) => setStore((p) => ({ ...p, sloganAr: e.target.value }))} placeholder={lang === "ar" ? "الشعار (عربي)" : "Slogan (AR)"} />
          <Input value={store.sloganEn || ""} onChange={(e) => setStore((p) => ({ ...p, sloganEn: e.target.value }))} placeholder={lang === "ar" ? "الشعار (إنجليزي)" : "Slogan (EN)"} />
          <Input value={store.contactPhone || ""} onChange={(e) => setStore((p) => ({ ...p, contactPhone: e.target.value }))} placeholder={lang === "ar" ? "الهاتف" : "Phone"} />
          <Input value={store.contactEmail || ""} onChange={(e) => setStore((p) => ({ ...p, contactEmail: e.target.value }))} placeholder={lang === "ar" ? "البريد الإلكتروني" : "Email"} />
          <Input value={store.addressAr || ""} onChange={(e) => setStore((p) => ({ ...p, addressAr: e.target.value }))} placeholder={lang === "ar" ? "العنوان (عربي)" : "Address (AR)"} />
          <Input value={store.addressEn || ""} onChange={(e) => setStore((p) => ({ ...p, addressEn: e.target.value }))} placeholder={lang === "ar" ? "العنوان (إنجليزي)" : "Address (EN)"} />
          <Input value={store.googleMapsLink || ""} onChange={(e) => setStore((p) => ({ ...p, googleMapsLink: e.target.value }))} placeholder={lang === "ar" ? "رابط خرائط Google للمحل" : "Google Maps location URL"} />
          <Input value={store.whatsappUrl || ""} onChange={(e) => setStore((p) => ({ ...p, whatsappUrl: e.target.value }))} placeholder={lang === "ar" ? "رابط واتساب (اختياري)" : "WhatsApp URL (optional)"} />
          <Input value={store.facebookUrl || ""} onChange={(e) => setStore((p) => ({ ...p, facebookUrl: e.target.value }))} placeholder={lang === "ar" ? "رابط فيسبوك" : "Facebook URL"} />
          <Input value={store.instagramUrl || ""} onChange={(e) => setStore((p) => ({ ...p, instagramUrl: e.target.value }))} placeholder={lang === "ar" ? "رابط إنستغرام" : "Instagram URL"} />
          <Input value={store.tiktokUrl || ""} onChange={(e) => setStore((p) => ({ ...p, tiktokUrl: e.target.value }))} placeholder={lang === "ar" ? "رابط تيك توك" : "TikTok URL"} />
          <Select value={store.defaultLanguage || "ar"} onValueChange={(v) => setStore((p) => ({ ...p, defaultLanguage: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <Select value={store.currency || "SDG"} onValueChange={(v) => setStore((p) => ({ ...p, currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SDG">SDG</SelectItem>
              <SelectItem value="EGP">EGP</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="SAR">SAR</SelectItem>
            </SelectContent>
          </Select>
          <div className="md:col-span-2">
            <Button disabled={saving} onClick={() => save("store", { nameAr: store.nameAr, nameEn: store.nameEn, sloganAr: store.sloganAr, sloganEn: store.sloganEn, contactPhone: store.contactPhone, contactEmail: store.contactEmail, addressAr: store.addressAr, addressEn: store.addressEn, googleMapsLink: store.googleMapsLink, whatsappUrl: store.whatsappUrl, facebookUrl: store.facebookUrl, instagramUrl: store.instagramUrl, tiktokUrl: store.tiktokUrl, defaultLanguage: store.defaultLanguage, currency: store.currency, maintenanceMode: !!store.maintenanceMode })}>
              {saving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : lang === "ar" ? "حفظ" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "shipping" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "مناطق الشحن والتسليم والخيارات العامة."
              : "Shipping zones, costs, and delivery options."}
          </p>
          <div className="flex flex-col gap-3 rounded-xl border p-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={!!store.cashOnDeliveryEnabled}
                onChange={(e) => setStore((p) => ({ ...p, cashOnDeliveryEnabled: e.target.checked }))}
              />
              {lang === "ar" ? "الدفع عند الاستلام" : "Cash on delivery"}
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={!!store.globalFreeShippingEnabled}
                onChange={(e) => setStore((p) => ({ ...p, globalFreeShippingEnabled: e.target.checked }))}
              />
              {lang === "ar" ? "شحن مجاني عام فوق مبلغ" : "Global free shipping above amount"}
            </label>
            <Input
              type="number"
              step="0.01"
              value={toInputString(store.globalFreeShippingAmount)}
              onChange={(e) => setStore((p) => ({ ...p, globalFreeShippingAmount: e.target.value }))}
              placeholder={lang === "ar" ? "الحد الأدنى للطلب (شحن مجاني)" : "Min order for free shipping"}
              className="max-w-md"
              dir="ltr"
            />
            <Input
              value={store.defaultDeliveryEstimateAr || ""}
              onChange={(e) => setStore((p) => ({ ...p, defaultDeliveryEstimateAr: e.target.value }))}
              placeholder={lang === "ar" ? "تقدير التسليم (عربي)" : "Default delivery estimate (AR)"}
            />
            <Input
              value={store.defaultDeliveryEstimateEn || ""}
              onChange={(e) => setStore((p) => ({ ...p, defaultDeliveryEstimateEn: e.target.value }))}
              placeholder={lang === "ar" ? "تقدير التسليم (إنجليزي)" : "Default delivery estimate (EN)"}
            />
            <textarea
              className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={store.deliveryNotesAr || ""}
              onChange={(e) => setStore((p) => ({ ...p, deliveryNotesAr: e.target.value }))}
              placeholder={lang === "ar" ? "ملاحظات التوصيل (عربي)" : "Delivery notes (AR)"}
            />
            <textarea
              className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={store.deliveryNotesEn || ""}
              onChange={(e) => setStore((p) => ({ ...p, deliveryNotesEn: e.target.value }))}
              placeholder={lang === "ar" ? "ملاحظات التوصيل (إنجليزي)" : "Delivery notes (EN)"}
            />
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{lang === "ar" ? "المناطق" : "Zones"}</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setStore((p) => ({
                    ...p,
                    shippingZones: [
                      ...(p.shippingZones || []),
                      {
                        id: `new-zone-${Date.now()}`,
                        zoneName: "",
                        governorates: [],
                        shippingCost: 0,
                        freeShippingMinOrder: null,
                        deliveryDaysEstimate: "",
                      },
                    ],
                  }))
                }
              >
                {lang === "ar" ? "إضافة منطقة" : "Add zone"}
              </Button>
            </div>
            {(store.shippingZones || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد مناطق" : "No zones yet"}</p>
            ) : (
              (store.shippingZones || []).map((z, idx) => (
                <div key={z.id || idx} className="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-2">
                  <Input
                    value={z.zoneName || ""}
                    onChange={(e) =>
                      setStore((p) => ({
                        ...p,
                        shippingZones: (p.shippingZones || []).map((sz, i) =>
                          i === idx ? { ...sz, zoneName: e.target.value } : sz
                        ),
                      }))
                    }
                    placeholder={lang === "ar" ? "اسم المنطقة" : "Zone name"}
                  />
                  <Input
                    value={Array.isArray(z.governorates) ? z.governorates.join(", ") : String(z.governorates || "")}
                    onChange={(e) =>
                      setStore((p) => ({
                        ...p,
                        shippingZones: (p.shippingZones || []).map((sz, i) =>
                          i === idx
                            ? {
                                ...sz,
                                governorates: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              }
                            : sz
                        ),
                      }))
                    }
                    placeholder={lang === "ar" ? "المحافظات (مفصولة بفاصلة)" : "Governorates (comma-separated)"}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={toInputString(z.shippingCost)}
                    onChange={(e) =>
                      setStore((p) => ({
                        ...p,
                        shippingZones: (p.shippingZones || []).map((sz, i) =>
                          i === idx ? { ...sz, shippingCost: e.target.value } : sz
                        ),
                      }))
                    }
                    placeholder={lang === "ar" ? "تكلفة الشحن" : "Shipping cost"}
                    dir="ltr"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={z.freeShippingMinOrder != null ? toInputString(z.freeShippingMinOrder) : ""}
                    onChange={(e) =>
                      setStore((p) => ({
                        ...p,
                        shippingZones: (p.shippingZones || []).map((sz, i) =>
                          i === idx
                            ? { ...sz, freeShippingMinOrder: e.target.value === "" ? null : e.target.value }
                            : sz
                        ),
                      }))
                    }
                    placeholder={lang === "ar" ? "حد أدنى لشحن مجاني (اختياري)" : "Free shipping min (optional)"}
                    dir="ltr"
                  />
                  <Input
                    className="md:col-span-2"
                    value={z.deliveryDaysEstimate || ""}
                    onChange={(e) =>
                      setStore((p) => ({
                        ...p,
                        shippingZones: (p.shippingZones || []).map((sz, i) =>
                          i === idx ? { ...sz, deliveryDaysEstimate: e.target.value } : sz
                        ),
                      }))
                    }
                    placeholder={lang === "ar" ? "أيام التوصيل (نص)" : "Delivery days (text)"}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="md:col-span-2 w-fit"
                    onClick={() =>
                      setStore((p) => ({
                        ...p,
                        shippingZones: (p.shippingZones || []).filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    {lang === "ar" ? "حذف المنطقة" : "Remove zone"}
                  </Button>
                </div>
              ))
            )}
          </div>

          <Button
            disabled={saving}
            onClick={() =>
              save("shipping", {
                globalFreeShippingEnabled: !!store.globalFreeShippingEnabled,
                globalFreeShippingAmount: store.globalFreeShippingAmount,
                cashOnDeliveryEnabled: !!store.cashOnDeliveryEnabled,
                deliveryNotesAr: store.deliveryNotesAr,
                deliveryNotesEn: store.deliveryNotesEn,
                defaultDeliveryEstimateAr: store.defaultDeliveryEstimateAr,
                defaultDeliveryEstimateEn: store.defaultDeliveryEstimateEn,
                zones: (store.shippingZones || []).map((z) => ({
                  zoneName: String(z.zoneName || "").trim() || "Zone",
                  governorates: Array.isArray(z.governorates) ? z.governorates : [],
                  shippingCost: Number(z.shippingCost) || 0,
                  freeShippingMinOrder:
                    z.freeShippingMinOrder != null && z.freeShippingMinOrder !== ""
                      ? Number(z.freeShippingMinOrder)
                      : null,
                  deliveryDaysEstimate: String(z.deliveryDaysEstimate || ""),
                })),
              })
            }
          >
            {saving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : lang === "ar" ? "حفظ الشحن" : "Save shipping"}
          </Button>
        </div>
      )}

      {activeTab === "payment" && (
        <div className="space-y-4">
          <Input
            value={store.invoicePrefix || ""}
            onChange={(e) => setStore((p) => ({ ...p, invoicePrefix: e.target.value }))}
            placeholder={lang === "ar" ? "بادئة الفاتورة" : "Invoice Prefix"}
          />
          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={!!store.vatEnabled}
              onChange={(e) => setStore((p) => ({ ...p, vatEnabled: e.target.checked }))}
            />
            {lang === "ar" ? "تفعيل ضريبة القيمة المضافة" : "Enable VAT"}
          </label>
          <Input
            type="number"
            step="0.01"
            value={toInputString(store.vatPercentage)}
            onChange={(e) => setStore((p) => ({ ...p, vatPercentage: e.target.value }))}
            placeholder={lang === "ar" ? "نسبة الضريبة %" : "VAT %"}
            dir="ltr"
          />
          <Input
            value={store.vatLabelAr || ""}
            onChange={(e) => setStore((p) => ({ ...p, vatLabelAr: e.target.value }))}
            placeholder={lang === "ar" ? "تسمية الضريبة (عربي)" : "VAT label (AR)"}
          />
          <Input
            value={store.vatLabelEn || ""}
            onChange={(e) => setStore((p) => ({ ...p, vatLabelEn: e.target.value }))}
            placeholder={lang === "ar" ? "تسمية الضريبة (إنجليزي)" : "VAT label (EN)"}
          />
          <Input
            type="number"
            step="0.01"
            value={toInputString(store.minOrderAmount)}
            onChange={(e) => setStore((p) => ({ ...p, minOrderAmount: e.target.value }))}
            placeholder={lang === "ar" ? "الحد الأدنى للطلب" : "Minimum order amount"}
            dir="ltr"
          />
          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-sm font-medium">{lang === "ar" ? "طرق الدفع" : "Payment methods"}</p>
            {(store.paymentMethods || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد طرق دفع" : "No payment methods"}</p>
            ) : (
              (store.paymentMethods || []).map((m, idx) => (
                <div key={m.id || m.code || idx} className="flex flex-wrap items-center gap-3 rounded-lg border p-2">
                  <span className="text-sm font-mono text-muted-foreground">{m.code}</span>
                  <span className="text-sm">{m.labelAr} / {m.labelEn}</span>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!m.isEnabled}
                      onChange={(e) =>
                        setStore((p) => ({
                          ...p,
                          paymentMethods: (p.paymentMethods || []).map((pm, i) =>
                            i === idx ? { ...pm, isEnabled: e.target.checked } : pm
                          ),
                        }))
                      }
                    />
                    {lang === "ar" ? "مفعّل" : "Enabled"}
                  </label>
                </div>
              ))
            )}
          </div>
          <Button
            disabled={saving}
            onClick={() =>
              save("payment", {
                syncPaymentMethods: true,
                methods: serializePaymentMethods(store.paymentMethods || []),
                invoicePrefix: store.invoicePrefix,
                vatEnabled: !!store.vatEnabled,
                vatPercentage: store.vatPercentage,
                vatLabelAr: store.vatLabelAr,
                vatLabelEn: store.vatLabelEn,
                minOrderAmount: store.minOrderAmount,
              })
            }
          >
            {lang === "ar" ? "حفظ إعدادات الدفع" : "Save payment"}
          </Button>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-4 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "تفعيل أو إيقاف أنواع الإشعارات. يتم دمج القيم غير المعدّلة مع الإعدادات الحالية."
              : "Toggle notification channels. Unchanged values keep existing settings."}
          </p>
          {[
            ["emailNewOrderAdmin", lang === "ar" ? "بريد: طلب جديد للمسؤول" : "Email: new order (admin)"],
            ["emailOrderStatusCustomer", lang === "ar" ? "بريد: حالة الطلب للعميل" : "Email: order status (customer)"],
            ["emailLowStockAdmin", lang === "ar" ? "بريد: مخزون منخفض" : "Email: low stock (admin)"],
            ["emailNewReturnAdmin", lang === "ar" ? "بريد: مرتجع جديد" : "Email: new return (admin)"],
            ["smsWhatsappEnabled", lang === "ar" ? "واتساب / SMS" : "WhatsApp / SMS"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!store.notificationConfig?.[key]}
                onChange={(e) =>
                  setStore((p) => ({
                    ...p,
                    notificationConfig: { ...(p.notificationConfig || {}), [key]: e.target.checked },
                  }))
                }
              />
              {label}
            </label>
          ))}
          <Input
            value={store.notificationConfig?.adminRecipients || ""}
            onChange={(e) =>
              setStore((p) => ({
                ...p,
                notificationConfig: { ...(p.notificationConfig || {}), adminRecipients: e.target.value },
              }))
            }
            placeholder={lang === "ar" ? "بريد المستلمين (مفصول بفواصل)" : "Admin recipient emails (comma-separated)"}
          />
          <Button
            disabled={saving}
            onClick={() =>
              save("notifications", {
                emailNewOrderAdmin: !!store.notificationConfig?.emailNewOrderAdmin,
                emailOrderStatusCustomer: !!store.notificationConfig?.emailOrderStatusCustomer,
                emailLowStockAdmin: !!store.notificationConfig?.emailLowStockAdmin,
                emailNewReturnAdmin: !!store.notificationConfig?.emailNewReturnAdmin,
                smsWhatsappEnabled: !!store.notificationConfig?.smsWhatsappEnabled,
                adminRecipients: store.notificationConfig?.adminRecipients || null,
              })
            }
          >
            {lang === "ar" ? "حفظ الإشعارات" : "Save notifications"}
          </Button>
        </div>
      )}

      {activeTab === "seo" && (
        <div className="space-y-3">
          <Input
            value={store.seoMetaTitleAr || ""}
            onChange={(e) => setStore((p) => ({ ...p, seoMetaTitleAr: e.target.value }))}
            placeholder={lang === "ar" ? "عنوان ميتا عربي" : "Meta title AR"}
          />
          <Input
            value={store.seoMetaTitleEn || ""}
            onChange={(e) => setStore((p) => ({ ...p, seoMetaTitleEn: e.target.value }))}
            placeholder={lang === "ar" ? "عنوان ميتا إنجليزي" : "Meta title EN"}
          />
          <textarea
            className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={store.seoMetaDescriptionAr || ""}
            onChange={(e) => setStore((p) => ({ ...p, seoMetaDescriptionAr: e.target.value }))}
            placeholder={lang === "ar" ? "وصف ميتا عربي" : "Meta description AR"}
          />
          <textarea
            className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={store.seoMetaDescriptionEn || ""}
            onChange={(e) => setStore((p) => ({ ...p, seoMetaDescriptionEn: e.target.value }))}
            placeholder={lang === "ar" ? "وصف ميتا إنجليزي" : "Meta description EN"}
          />
          <Input
            value={store.googleAnalyticsId || ""}
            onChange={(e) => setStore((p) => ({ ...p, googleAnalyticsId: e.target.value }))}
            placeholder="Google Analytics ID"
            dir="ltr"
          />
          <Input
            value={store.googleSearchConsoleVerification || ""}
            onChange={(e) => setStore((p) => ({ ...p, googleSearchConsoleVerification: e.target.value }))}
            placeholder={lang === "ar" ? "تحقق Search Console" : "Search Console verification"}
            dir="ltr"
          />
          <Input
            value={store.seoOgImageUrl || ""}
            onChange={(e) => setStore((p) => ({ ...p, seoOgImageUrl: e.target.value }))}
            placeholder={lang === "ar" ? "صورة OG (رابط)" : "Open Graph image URL"}
            dir="ltr"
          />
          <textarea
            className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={store.robotsTxt || ""}
            onChange={(e) => setStore((p) => ({ ...p, robotsTxt: e.target.value }))}
            placeholder="robots.txt"
            dir="ltr"
          />
          <Button
            disabled={saving}
            onClick={() =>
              save("seo", {
                seoMetaTitleAr: store.seoMetaTitleAr,
                seoMetaTitleEn: store.seoMetaTitleEn,
                seoMetaDescriptionAr: store.seoMetaDescriptionAr,
                seoMetaDescriptionEn: store.seoMetaDescriptionEn,
                googleAnalyticsId: store.googleAnalyticsId,
                googleSearchConsoleVerification: store.googleSearchConsoleVerification,
                robotsTxt: store.robotsTxt,
                seoOgImageUrl: store.seoOgImageUrl,
              })
            }
          >
            {lang === "ar" ? "حفظ SEO" : "Save SEO"}
          </Button>
        </div>
      )}

      {activeTab === "legal" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "HTML آمن فقط (بدون سكربت). استخدم عناوين h2 مع id للفهرس."
              : "Safe HTML only (no scripts). Use h2 with id for the table of contents."}
          </p>
          <p className="text-xs font-semibold text-foreground">{lang === "ar" ? "شروط الخدمة — عربي" : "Terms — Arabic"}</p>
          <textarea
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6"
            value={legal.termsAr}
            onChange={(e) => setLegal((p) => ({ ...p, termsAr: e.target.value }))}
          />
          <p className="text-xs font-semibold text-foreground">{lang === "ar" ? "شروط الخدمة — English" : "Terms — English"}</p>
          <textarea
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6"
            value={legal.termsEn}
            onChange={(e) => setLegal((p) => ({ ...p, termsEn: e.target.value }))}
          />
          <p className="text-xs font-semibold text-foreground">{lang === "ar" ? "سياسة الخصوصية — عربي" : "Privacy — Arabic"}</p>
          <textarea
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6"
            value={legal.privacyAr}
            onChange={(e) => setLegal((p) => ({ ...p, privacyAr: e.target.value }))}
          />
          <p className="text-xs font-semibold text-foreground">{lang === "ar" ? "سياسة الخصوصية — English" : "Privacy — English"}</p>
          <textarea
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6"
            value={legal.privacyEn}
            onChange={(e) => setLegal((p) => ({ ...p, privacyEn: e.target.value }))}
          />
          <Button disabled={saving} onClick={() => save("legal", legal)}>
            {lang === "ar" ? "حفظ الصفحات القانونية" : "Save legal pages"}
          </Button>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="space-y-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <Input
                value={usersSearch}
                onChange={(e) => {
                  setUsersSearch(e.target.value);
                  setUsersPage(1);
                }}
                placeholder={lang === "ar" ? "بحث بالمستخدم/الإيميل" : "Search user/email"}
                className="max-w-sm"
              />
              <Select value={usersRoleFilter} onValueChange={(v) => { setUsersRoleFilter(v); setUsersPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ALL</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="MANAGER">MANAGER</SelectItem>
                  <SelectItem value="CASHIER">CASHIER</SelectItem>
                  <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {usersLoading ? (
              <p className="text-sm text-muted-foreground">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا يوجد مستخدمون" : "No users found"}</p>
            ) : (
              users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                  <div className="min-w-48">
                    <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Select value={u.role} onValueChange={(v) => setUsers((prev) => prev.map((it) => it.id === u.id ? { ...it, role: v } : it))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="MANAGER">MANAGER</SelectItem>
                      <SelectItem value="CASHIER">CASHIER</SelectItem>
                      <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={u.isActive !== false}
                      onChange={(e) =>
                        setUsers((prev) =>
                          prev.map((it) => (it.id === u.id ? { ...it, isActive: e.target.checked } : it))
                        )
                      }
                    />
                    {lang === "ar" ? "نشط" : "Active"}
                  </label>
                  <Button
                    size="sm"
                    onClick={() => {
                      const selected = users.find((it) => it.id === u.id) || u;
                      save("users", { updateUser: selected });
                    }}
                  >
                    {lang === "ar" ? "تحديث" : "Update"}
                  </Button>
                </div>
              ))
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{usersTotal} {lang === "ar" ? "نتيجة" : "results"}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={usersPage <= 1} onClick={() => setUsersPage((p) => p - 1)}>
                  {lang === "ar" ? "السابق" : "Prev"}
                </Button>
                <span>{usersPage} / {usersPages}</span>
                <Button size="sm" variant="outline" disabled={usersPage >= usersPages} onClick={() => setUsersPage((p) => p + 1)}>
                  {lang === "ar" ? "التالي" : "Next"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <Input
                value={rolesSearch}
                onChange={(e) => {
                  setRolesSearch(e.target.value);
                  setRolesPage(1);
                }}
                placeholder={lang === "ar" ? "بحث بالموديول" : "Search module"}
                className="max-w-sm"
              />
              <Select value={rolesRoleFilter} onValueChange={(v) => { setRolesRoleFilter(v); setRolesPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ALL</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="MANAGER">MANAGER</SelectItem>
                  <SelectItem value="CASHIER">CASHIER</SelectItem>
                  <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs">
                    <th className="p-2 text-start">Role</th>
                    <th className="p-2 text-start">Module</th>
                    <th className="p-2 text-center">View</th>
                    <th className="p-2 text-center">Create</th>
                    <th className="p-2 text-center">Edit</th>
                    <th className="p-2 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rolesLoading ? (
                    <tr><td className="p-3 text-muted-foreground" colSpan={6}>{lang === "ar" ? "جاري التحميل..." : "Loading..."}</td></tr>
                  ) : permissions.length === 0 ? (
                    <tr><td className="p-3 text-muted-foreground" colSpan={6}>{lang === "ar" ? "لا توجد صلاحيات" : "No permissions found"}</td></tr>
                  ) : (
                    permissions.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="p-2">{p.role}</td>
                        <td className="p-2">{p.module}</td>
                        <td className="p-2 text-center">{p.canView ? "✓" : "—"}</td>
                        <td className="p-2 text-center">{p.canCreate ? "✓" : "—"}</td>
                        <td className="p-2 text-center">{p.canEdit ? "✓" : "—"}</td>
                        <td className="p-2 text-center">{p.canDelete ? "✓" : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{rolesTotal} {lang === "ar" ? "نتيجة" : "results"}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={rolesPage <= 1} onClick={() => setRolesPage((p) => p - 1)}>
                  {lang === "ar" ? "السابق" : "Prev"}
                </Button>
                <span>{rolesPage} / {rolesPages}</span>
                <Button size="sm" variant="outline" disabled={rolesPage >= rolesPages} onClick={() => setRolesPage((p) => p + 1)}>
                  {lang === "ar" ? "التالي" : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "backup" && (
        <div className="space-y-3">
          <Select value={store.backupSchedule || "OFF"} onValueChange={(v) => setStore((p) => ({ ...p, backupSchedule: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OFF">{lang === "ar" ? "إيقاف" : "Off"}</SelectItem>
              <SelectItem value="DAILY">{lang === "ar" ? "يومي" : "Daily"}</SelectItem>
              <SelectItem value="WEEKLY">{lang === "ar" ? "أسبوعي" : "Weekly"}</SelectItem>
              <SelectItem value="MONTHLY">{lang === "ar" ? "شهري" : "Monthly"}</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={saving} onClick={() => save("backup", { backupSchedule: store.backupSchedule || "OFF" })}>
            {lang === "ar" ? "حفظ النسخ الاحتياطي" : "Save Backup"}
          </Button>
        </div>
      )}

      {activeTab === "system" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">App version: {store.appVersion || "0.1.0"}</p>
          <Button disabled={saving} onClick={() => save("system", { maintenanceMode: !store.maintenanceMode })}>
            {store.maintenanceMode ? (lang === "ar" ? "إلغاء وضع الصيانة" : "Disable Maintenance") : (lang === "ar" ? "تفعيل وضع الصيانة" : "Enable Maintenance")}
          </Button>
        </div>
      )}
    </div>
  );
}
