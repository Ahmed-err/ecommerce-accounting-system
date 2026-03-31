"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSettingsRolesPage, getSettingsUsersPage, updateSettings } from "@/app/actions/settings";

const TABS = ["store", "about", "payment", "notifications", "seo", "legal", "users", "backup", "system"];

export default function AdminSettingsClient({ initialTab, initialData, lang }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [store, setStore] = useState(initialData.store);
  const [users, setUsers] = useState(initialData.users || []);
  const [permissions, setPermissions] = useState(initialData.permissions || []);
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
    setStore(initialData.store);
    setUsers(initialData.users || []);
    setLegal({
      termsAr: initialData.legal?.terms?.contentAr ?? "",
      termsEn: initialData.legal?.terms?.contentEn ?? "",
      privacyAr: initialData.legal?.privacy?.contentAr ?? "",
      privacyEn: initialData.legal?.privacy?.contentEn ?? "",
    });
    setPermissions(initialData.permissions || []);
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
    startTransition(async () => {
      const res = await updateSettings({ tab, payload });
      if (res.success) {
        if (res.data?.store) setStore(res.data.store);
        if (res.data?.users) setUsers(res.data.users);
        if (res.data?.permissions) setPermissions(res.data.permissions);
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
        router.refresh();
      } else {
        setStatus(res.error || "Failed");
        setStatusType("error");
      }
    });
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
            disabled={isPending}
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
            {isPending ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : lang === "ar" ? "حفظ صفحة من نحن" : "Save About page"}
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
            <Button disabled={isPending} onClick={() => save("store", { nameAr: store.nameAr, nameEn: store.nameEn, sloganAr: store.sloganAr, sloganEn: store.sloganEn, contactPhone: store.contactPhone, contactEmail: store.contactEmail, defaultLanguage: store.defaultLanguage, currency: store.currency, maintenanceMode: !!store.maintenanceMode })}>
              {isPending ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : lang === "ar" ? "حفظ" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "payment" && (
        <div className="space-y-3">
          <Input value={store.invoicePrefix || ""} onChange={(e) => setStore((p) => ({ ...p, invoicePrefix: e.target.value }))} placeholder={lang === "ar" ? "بادئة الفاتورة" : "Invoice Prefix"} />
          <Input type="number" value={store.vatPercentage || ""} onChange={(e) => setStore((p) => ({ ...p, vatPercentage: e.target.value }))} placeholder={lang === "ar" ? "نسبة الضريبة" : "VAT %"} />
          <Button disabled={isPending} onClick={() => save("payment", { methods: store.paymentMethods || [], invoicePrefix: store.invoicePrefix, vatEnabled: !!store.vatEnabled, vatPercentage: store.vatPercentage, vatLabelAr: store.vatLabelAr, vatLabelEn: store.vatLabelEn, minOrderAmount: store.minOrderAmount })}>
            {lang === "ar" ? "حفظ إعدادات الدفع" : "Save Payment"}
          </Button>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-3">
          <Input value={store.notificationConfig?.adminRecipients || ""} onChange={(e) => setStore((p) => ({ ...p, notificationConfig: { ...(p.notificationConfig || {}), adminRecipients: e.target.value } }))} placeholder={lang === "ar" ? "بريد المستلمين" : "Recipients emails"} />
          <Button disabled={isPending} onClick={() => save("notifications", store.notificationConfig || {})}>
            {lang === "ar" ? "حفظ الإشعارات" : "Save Notifications"}
          </Button>
        </div>
      )}

      {activeTab === "seo" && (
        <div className="space-y-3">
          <Input value={store.seoMetaTitleAr || ""} onChange={(e) => setStore((p) => ({ ...p, seoMetaTitleAr: e.target.value }))} placeholder={lang === "ar" ? "عنوان ميتا عربي" : "Meta title AR"} />
          <Input value={store.seoMetaTitleEn || ""} onChange={(e) => setStore((p) => ({ ...p, seoMetaTitleEn: e.target.value }))} placeholder={lang === "ar" ? "عنوان ميتا إنجليزي" : "Meta title EN"} />
          <Button disabled={isPending} onClick={() => save("seo", { seoMetaTitleAr: store.seoMetaTitleAr, seoMetaTitleEn: store.seoMetaTitleEn, seoMetaDescriptionAr: store.seoMetaDescriptionAr, seoMetaDescriptionEn: store.seoMetaDescriptionEn, googleAnalyticsId: store.googleAnalyticsId, googleSearchConsoleVerification: store.googleSearchConsoleVerification, robotsTxt: store.robotsTxt, seoOgImageUrl: store.seoOgImageUrl })}>
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
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={legal.termsAr}
            onChange={(e) => setLegal((p) => ({ ...p, termsAr: e.target.value }))}
          />
          <p className="text-xs font-semibold text-foreground">{lang === "ar" ? "شروط الخدمة — English" : "Terms — English"}</p>
          <textarea
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={legal.termsEn}
            onChange={(e) => setLegal((p) => ({ ...p, termsEn: e.target.value }))}
          />
          <p className="text-xs font-semibold text-foreground">{lang === "ar" ? "سياسة الخصوصية — عربي" : "Privacy — Arabic"}</p>
          <textarea
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={legal.privacyAr}
            onChange={(e) => setLegal((p) => ({ ...p, privacyAr: e.target.value }))}
          />
          <p className="text-xs font-semibold text-foreground">{lang === "ar" ? "سياسة الخصوصية — English" : "Privacy — English"}</p>
          <textarea
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={legal.privacyEn}
            onChange={(e) => setLegal((p) => ({ ...p, privacyEn: e.target.value }))}
          />
          <Button disabled={isPending} onClick={() => save("legal", legal)}>
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
          <Button disabled={isPending} onClick={() => save("backup", { backupSchedule: store.backupSchedule || "OFF" })}>
            {lang === "ar" ? "حفظ النسخ الاحتياطي" : "Save Backup"}
          </Button>
        </div>
      )}

      {activeTab === "system" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">App version: {store.appVersion || "0.1.0"}</p>
          <Button disabled={isPending} onClick={() => save("system", { maintenanceMode: !store.maintenanceMode })}>
            {store.maintenanceMode ? (lang === "ar" ? "إلغاء وضع الصيانة" : "Disable Maintenance") : (lang === "ar" ? "تفعيل وضع الصيانة" : "Enable Maintenance")}
          </Button>
        </div>
      )}
    </div>
  );
}
