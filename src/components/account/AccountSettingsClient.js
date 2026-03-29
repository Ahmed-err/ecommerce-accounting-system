"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import {
  updateAccountProfile,
  resendEmailVerification,
  changeAccountPassword,
  updateNotificationPreferences,
  updateAccountPreferences,
  revokeSessionToken,
  revokeAllOtherSessions,
  deleteMyAccount,
} from "@/app/actions/user";
import {
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
} from "@/app/actions/addresses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { SUDAN_CITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TABS = ["profile", "addresses", "security", "notifications", "preferences"];

function passwordStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[0-9]/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.min(s, 3);
}

export default function AccountSettingsClient({
  initialTab,
  user: initialUser,
  addresses: initialAddresses,
  sessions,
  hasOAuth,
  whatsappEnabled,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang, setLang, isRTL } = useLanguage();
  const t = translations[lang] || translations.en;
  const { setTheme } = useTheme();
  const { update } = useSession();

  const activeTab = TABS.includes(initialTab) ? initialTab : "profile";

  const [user, setUser] = useState(initialUser);
  const [addresses, setAddresses] = useState(initialAddresses || []);
  const [profileSaving, setProfileSaving] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [dob, setDob] = useState(user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");

  const emailVerified = !!user?.emailVerified;
  const [notify, setNotify] = useState({
    marketingUnsubscribed: user?.marketingUnsubscribed ?? false,
    notifyOrderStatusEmail: user?.notifyOrderStatusEmail ?? true,
    notifyPromoEmail: user?.notifyPromoEmail ?? true,
    notifyNewArrivalsEmail: user?.notifyNewArrivalsEmail ?? true,
    notifyWhatsapp: user?.notifyWhatsapp ?? false,
  });

  const [prefLanguage, setPrefLanguage] = useState(user?.prefLanguage || lang);
  const [prefTheme, setPrefThemeLocal] = useState(user?.prefTheme || "system");
  const [prefCurrency, setPrefCurrency] = useState(user?.prefCurrency || "");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(
    user?.newsletterSubscribed ?? true
  );

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [pwdFieldErr, setPwdFieldErr] = useState({});

  const [addrOpen, setAddrOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addrForm, setAddrForm] = useState({
    label: "",
    fullName: "",
    phone: "",
    governorate: "",
    city: "",
    street: "",
    building: "",
    floor: "",
    notes: "",
    setDefault: false,
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const setTab = useCallback(
    (tab) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", tab);
      router.push(`${pathname}?${p.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const uploadAvatar = async (file) => {
    const fd = new FormData();
    fd.append("folder", "avatars");
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    const res = await updateAccountProfile({
      firstName,
      lastName,
      phone,
      gender: gender || "",
      dateOfBirth: dob || null,
      avatar: avatarUrl || null,
    });
    setProfileSaving(false);
    if (res.success) {
      toast.success(t.accountProfileSaved);
      await update?.();
      router.refresh();
    } else if (res.error === "phone_in_use") {
      toast.error(t.accountPhoneInUse);
    } else toast.error(res.error || t.error);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
      toast.success(t.success);
    } catch (err) {
      toast.error(err.message || t.error);
    }
  };

  const handleResendVerify = async () => {
    const res = await resendEmailVerification();
    if (res.success) toast.success(t.accountVerifiedSent);
    else toast.error(res.error || t.error);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdFieldErr({});
    const res = await changeAccountPassword({
      currentPassword: curPwd,
      newPassword: newPwd,
      confirmPassword: confPwd,
    });
    if (res.success) {
      toast.success(t.success);
      setCurPwd("");
      setNewPwd("");
      setConfPwd("");
    } else {
      if (res.field) setPwdFieldErr({ [res.field]: res.error });
      toast.error(res.error || t.error);
    }
  };

  const patchNotify = async (payload) => {
    const prev = { ...notify };
    const next = { ...notify, ...payload };
    setNotify(next);
    const res = await updateNotificationPreferences(next);
    if (!res.success) {
      setNotify(prev);
      toast.error(res.error || t.error);
    } else {
      router.refresh();
    }
  };

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setPrefsSaving(true);
    const res = await updateAccountPreferences({
      prefLanguage,
      prefTheme,
      prefCurrency: prefCurrency || null,
      newsletterSubscribed,
    });
    setPrefsSaving(false);
    if (res.success) {
      toast.success(t.accountPrefsSaved);
      if (prefLanguage !== lang) setLang(prefLanguage);
      setTheme(prefTheme);
      document.cookie = `lang=${prefLanguage}; path=/; max-age=${60 * 60 * 24 * 365}`;
      router.refresh();
    } else toast.error(res.error || t.error);
  };

  const openNewAddress = () => {
    if (addresses.length >= 5) {
      toast.error(t.accountAddressLimit);
      return;
    }
    setEditingId(null);
    setAddrForm({
      label: "",
      fullName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
      phone: user?.phone || "",
      governorate: SUDAN_CITIES[0]?.name || "",
      city: "",
      street: "",
      building: "",
      floor: "",
      notes: "",
      setDefault: addresses.length === 0,
    });
    setAddrOpen(true);
  };

  const openEditAddress = (a) => {
    setEditingId(a.id);
    setAddrForm({
      label: a.label || "",
      fullName: a.fullName,
      phone: a.phone,
      governorate: a.governorate || SUDAN_CITIES[0]?.name || "",
      city: a.city,
      street: a.street || a.addressLine || "",
      building: a.building || "",
      floor: a.floor || "",
      notes: a.notes || "",
      setDefault: a.isDefault,
    });
    setAddrOpen(true);
  };

  const saveAddress = async () => {
    const payload = { ...addrForm };
    const res = editingId
      ? await updateUserAddress(editingId, payload)
      : await createUserAddress(payload);
    if (res.success) {
      toast.success(t.success);
      setAddrOpen(false);
      router.refresh();
    } else if (res.error === "address_limit") {
      toast.error(t.accountAddressLimit);
    } else toast.error(res.error || t.error);
  };

  const pwdLabel = useMemo(() => {
    const s = passwordStrength(newPwd);
    if (s <= 0) return "";
    if (s === 1) return t.accountPasswordWeak;
    if (s === 2) return t.accountPasswordMedium;
    return t.accountPasswordStrong;
  }, [newPwd, t]);

  const strengthWidth = `${((passwordStrength(newPwd) + 1) / 4) * 100}%`;

  return (
    <div className={cn("space-y-8", isRTL ? "text-right" : "text-left")} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t.accountSettingsTitle}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={activeTab === tab ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(tab)}
          >
            {tab === "profile" && t.accountTabProfile}
            {tab === "addresses" && t.accountTabAddresses}
            {tab === "security" && t.accountTabSecurity}
            {tab === "notifications" && t.accountTabNotifications}
            {tab === "preferences" && t.accountTabPreferences}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>{t.accountTabProfile}</CardTitle>
                <CardDescription>{t.settingsProfileInfo}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-border bg-muted">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="" fill className="object-cover" sizes="96px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground">
                        {(firstName?.[0] || user?.email?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer">
                      <span className="text-sm font-medium text-amber-600">{t.accountAvatarUpload}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                </div>

                {!emailVerified && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <Badge variant="warning">{t.accountEmailUnverified}</Badge>
                    {user?.hasPassword && (
                      <Button type="button" size="sm" variant="outline" onClick={handleResendVerify}>
                        {t.accountResendVerification}
                      </Button>
                    )}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t.employeesFirstName}</label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t.employeesLastName}</label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t.email}</label>
                    <Input value={user?.email || ""} disabled className="opacity-70" />
                    {hasOAuth && (
                      <p className="text-xs text-muted-foreground">{t.accountEmailReadOnly}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t.phoneOptional}</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="regular-nums" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t.accountGender}</label>
                    <Select value={gender || "none"} onValueChange={(v) => setGender(v === "none" ? "" : v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="male">{t.accountGenderMale}</SelectItem>
                        <SelectItem value="female">{t.accountGenderFemale}</SelectItem>
                        <SelectItem value="other">{t.accountGenderOther}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t.accountDob}</label>
                    <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={profileSaving} className="bg-amber-500 text-black hover:bg-amber-600">
                      {profileSaving ? t.saving : t.accountSaveProfile}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "addresses" && (
            <Card>
              <CardHeader>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle>{t.accountAddressesTitle}</CardTitle>
                    <CardDescription>{addresses.length}/5</CardDescription>
                  </div>
                  <Button type="button" onClick={openNewAddress} className="bg-amber-500 text-black hover:bg-amber-600">
                    {t.accountAddressAdd}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {addresses.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t.noOrdersYet}</p>
                )}
                {addresses.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 sm:flex-row sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{a.label || a.city}</span>
                        {a.isDefault && <Badge variant="secondary">{t.accountDefaultBadge}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.fullName} · {a.phone}</p>
                      <p className="text-sm">{a.addressLine}, {a.city}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEditAddress(a)}>
                        {t.edit}
                      </Button>
                      {!a.isDefault && (
                        <Button type="button" size="sm" variant="secondary" onClick={() => setDefaultUserAddress(a.id).then(() => router.refresh())}>
                          {t.accountSetDefault}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm(t.accountConfirmDeleteAddress)) return;
                          await deleteUserAddress(a.id);
                          router.refresh();
                        }}
                      >
                        {t.accountDeleteAddress}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t.accountSecurityPassword}</CardTitle>
                </CardHeader>
                <CardContent>
                  {!user?.hasPassword ? (
                    <p className="text-sm text-muted-foreground">{t.accountOAuthNoPassword}</p>
                  ) : (
                    <form onSubmit={handleChangePassword} className="max-w-md space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground">{t.accountCurrentPassword}</label>
                        <Input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} className={pwdFieldErr.currentPassword ? "border-destructive" : ""} />
                        {pwdFieldErr.currentPassword && (
                          <p className="text-xs text-destructive mt-1">{pwdFieldErr.currentPassword}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">{t.accountNewPassword}</label>
                        <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className={pwdFieldErr.newPassword ? "border-destructive" : ""} />
                        {pwdLabel && (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted">
                            <div className="h-full bg-amber-500 transition-all" style={{ width: strengthWidth }} />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{pwdLabel}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">{t.accountConfirmPassword}</label>
                        <Input type="password" value={confPwd} onChange={(e) => setConfPwd(e.target.value)} className={pwdFieldErr.confirmPassword ? "border-destructive" : ""} />
                      </div>
                      <Button type="submit" className="bg-amber-500 text-black hover:bg-amber-600">{t.save}</Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.accountSessionsTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!sessions?.length && (
                    <p className="text-sm text-muted-foreground">{t.accountSessionsEmpty}</p>
                  )}
                  {sessions?.map((s, i) => (
                    <div key={s.sessionToken} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">Web · #{s.sessionToken.slice(0, 8)}…</p>
                        <p className="text-xs text-muted-foreground">
                          {t.empColDate}: {new Date(s.updatedAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                        </p>
                        {i === 0 && <Badge className="mt-1">{t.accountSessionThis}</Badge>}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const r = await revokeSessionToken(s.sessionToken);
                          if (r.success) router.refresh();
                          else toast.error(r.error || t.error);
                        }}
                      >
                        {t.accountSessionRevoke}
                      </Button>
                    </div>
                  ))}
                  {sessions?.length > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        await revokeAllOtherSessions();
                        router.refresh();
                        toast.message(t.success);
                      }}
                    >
                      {t.accountSessionsRevokeOthers}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">{t.accountDangerZone}</CardTitle>
                  <CardDescription>{t.accountDeleteTitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                    {t.accountDeleteTitle}
                  </Button>
                </CardContent>
              </Card>

              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t.accountDeleteTitle}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <p className="text-sm text-muted-foreground">{t.accountDeleteHint}</p>
                    <Input value={deletePhrase} onChange={(e) => setDeletePhrase(e.target.value)} placeholder={t.accountDeleteConfirmPhrase} />
                    {user?.hasPassword && (
                      <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder={t.accountDeletePassword} />
                    )}
                  </div>
                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>{t.cancel}</Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        const res = await deleteMyAccount({
                          confirmPhrase: deletePhrase,
                          password: deletePassword || undefined,
                        });
                        if (res.success) {
                          toast.success(t.success);
                          setDeleteOpen(false);
                          await signOut({ callbackUrl: "/" });
                        } else toast.error(res.error || t.error);
                      }}
                    >
                      {t.delete}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>{t.accountNotificationsTitle}</CardTitle>
                <CardDescription>{t.accountNotifyTransactionalNote}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <span className="text-sm">{t.accountNotifyOrderStatus}</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-amber-500"
                    checked={!!notify.notifyOrderStatusEmail}
                    onChange={(e) => patchNotify({ notifyOrderStatusEmail: e.target.checked })}
                  />
                </label>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{t.accountNotifyMasterOff}</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-amber-500"
                    checked={!!notify.marketingUnsubscribed}
                    onChange={(e) => patchNotify({ marketingUnsubscribed: e.target.checked })}
                  />
                </div>
                <div className={cn("space-y-3", notify.marketingUnsubscribed && "opacity-50 pointer-events-none")}>
                  <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <span className="text-sm">{t.accountNotifyPromo}</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-amber-500"
                      checked={!!notify.notifyPromoEmail}
                      onChange={(e) => patchNotify({ notifyPromoEmail: e.target.checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <span className="text-sm">{t.accountNotifyArrivals}</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-amber-500"
                      checked={!!notify.notifyNewArrivalsEmail}
                      onChange={(e) => patchNotify({ notifyNewArrivalsEmail: e.target.checked })}
                    />
                  </label>
                  {whatsappEnabled && (
                    <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                      <span className="text-sm">{t.accountNotifyWhatsapp}</span>
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-amber-500"
                        checked={!!notify.notifyWhatsapp}
                        onChange={(e) => patchNotify({ notifyWhatsapp: e.target.checked })}
                      />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>{t.accountPrefsTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSavePrefs} className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t.language}</label>
                    <Select value={prefLanguage} onValueChange={setPrefLanguage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t.appearance}</label>
                    <Select value={prefTheme} onValueChange={setPrefThemeLocal}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">{t.themeLight}</SelectItem>
                        <SelectItem value="dark">{t.themeDark}</SelectItem>
                        <SelectItem value="system">{t.themeSystem}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t.accountPrefCurrency}</label>
                    <Input value={prefCurrency} onChange={(e) => setPrefCurrency(e.target.value)} placeholder="SDG" />
                  </div>
                  <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <span className="text-sm">{t.newsletterTitle}</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-amber-500"
                      checked={newsletterSubscribed}
                      onChange={(e) => setNewsletterSubscribed(e.target.checked)}
                    />
                  </label>
                  <Button type="submit" disabled={prefsSaving} className="bg-amber-500 text-black hover:bg-amber-600">
                    {prefsSaving ? t.saving : t.save}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <Dialog open={addrOpen} onOpenChange={setAddrOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t.accountAddressEdit : t.accountAddressAdd}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2">
            <Input placeholder={t.accountAddressLabel} value={addrForm.label} onChange={(e) => setAddrForm((f) => ({ ...f, label: e.target.value }))} />
            <Input placeholder={t.fullName} value={addrForm.fullName} onChange={(e) => setAddrForm((f) => ({ ...f, fullName: e.target.value }))} required />
            <Input placeholder={t.phoneRequiredLabel} value={addrForm.phone} onChange={(e) => setAddrForm((f) => ({ ...f, phone: e.target.value }))} />
            <Select value={addrForm.governorate} onValueChange={(v) => setAddrForm((f) => ({ ...f, governorate: v }))}>
              <SelectTrigger><SelectValue placeholder={t.accountAddressGovernorate} /></SelectTrigger>
              <SelectContent>
                {SUDAN_CITIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{lang === "ar" ? c.arName : c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder={t.shippingCityLabel} value={addrForm.city} onChange={(e) => setAddrForm((f) => ({ ...f, city: e.target.value }))} />
            <Input placeholder={t.accountAddressStreet} value={addrForm.street} onChange={(e) => setAddrForm((f) => ({ ...f, street: e.target.value }))} />
            <Input placeholder={t.accountAddressBuilding} value={addrForm.building} onChange={(e) => setAddrForm((f) => ({ ...f, building: e.target.value }))} />
            <Input placeholder={t.accountAddressFloor} value={addrForm.floor} onChange={(e) => setAddrForm((f) => ({ ...f, floor: e.target.value }))} />
            <Input placeholder={t.accountAddressNotes} value={addrForm.notes} onChange={(e) => setAddrForm((f) => ({ ...f, notes: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-500"
                checked={!!addrForm.setDefault}
                onChange={(e) => setAddrForm((f) => ({ ...f, setDefault: e.target.checked }))}
              />
              {t.accountSetDefault}
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddrOpen(false)}>{t.cancel}</Button>
            <Button type="button" onClick={saveAddress} className="bg-amber-500 text-black">{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
