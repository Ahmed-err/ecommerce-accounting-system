"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEmployee, updateEmployee } from "@/app/actions/employees";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { normalizeAppLang } from "@/lib/i18n-lang";
import { Eye, EyeOff } from "lucide-react";

const ROLES = ["ADMIN", "MANAGER", "CASHIER"];
const DEPARTMENTS = ["Management", "Sales", "Warehouse", "Support", "IT", "Finance"];

const today = () => new Date().toISOString().split("T")[0];

export default function EmployeeForm({ isOpen, onClose, employee }) {
  const router = useRouter();
  const { lang: langRaw, isRTL } = useLanguage();
  const lang = normalizeAppLang(langRaw);
  const t = translations[lang] || translations.ar;
  const isEditing = !!employee;

  const departmentOptions = useMemo(() => {
    const d = employee?.department?.trim();
    if (d && !DEPARTMENTS.includes(d)) {
      return [...DEPARTMENTS, d];
    }
    return DEPARTMENTS;
  }, [employee?.department]);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    password: "", role: "CASHIER", department: "",
    salary: "", hireDate: today(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        email: employee.email || "",
        phone: employee.phone || "",
        password: "",
        role: employee.role || "CASHIER",
        department: employee.department || "",
        salary: employee.salary?.toString() || "",
        hireDate: employee.hireDate
          ? new Date(employee.hireDate).toISOString().split("T")[0]
          : today(),
      });
    } else {
      setFormData({
        firstName: "", lastName: "", email: "", phone: "",
        password: "", role: "CASHIER", department: "",
        salary: "", hireDate: today(),
      });
    }
    setError("");
  }, [employee, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.firstName.trim() || !formData.lastName.trim())
        throw new Error(lang === 'ar' ? "الاسم الأول والأخير مطلوبان" : "First and last name are required.");
      if (!formData.email.trim()) throw new Error(lang === 'ar' ? "البريد الإلكتروني مطلوب" : "Email is required.");
      if (!isEditing && (!formData.password || formData.password.length < 6))
        throw new Error(lang === 'ar' ? "يجب أن تكون كلمة المرور ٦ أحرف على الأقل" : "Password must be at least 6 characters.");

      const res = isEditing
        ? await updateEmployee(employee.id, formData)
        : await createEmployee(formData);

      if (res.success) {
        router.refresh();
        onClose();
      } else {
        setError(res.error || (lang === 'ar' ? "فشل حفظ الموظف" : "Failed to save employee."));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side={isRTL ? "right" : "left"} className={`w-full overflow-y-auto border-border bg-card pb-24 text-card-foreground sm:max-w-2xl ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
        <SheetHeader>
          <SheetTitle className={isRTL ? "text-right" : "text-left"}>
            {isEditing ? t.employeesEditEmployeeHeader : t.employeesAddNewEmployeeHeader}
          </SheetTitle>
          <SheetDescription className={isRTL ? "text-right" : "text-left"}>
            {isEditing ? t.employeesUpdateDetails : t.employeesFillDetails}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 px-2 pb-6">
          {error && <div className="rounded-md bg-red-500/15 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

          {/* Personal Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.employeesPersonalInfo}</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.employeesFirstName}</label>
                <Input name="firstName" value={formData.firstName} onChange={handleChange} required className={`border-border bg-background ${isRTL ? "text-right" : "text-left"}`} placeholder={lang === 'ar' ? "مثال: أحمد" : "John"} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.employeesLastName}</label>
                <Input name="lastName" value={formData.lastName} onChange={handleChange} required className={`border-border bg-background ${isRTL ? "text-right" : "text-left"}`} placeholder={lang === 'ar' ? "مثال: علي" : "Doe"} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.employeesEmail}</label>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={isEditing} className={`border-border bg-background disabled:opacity-60 ${isRTL ? "text-right" : "text-left"}`} placeholder="admin@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.employeesPhone} <span className="text-xs text-muted-foreground">{t.optional}</span></label>
                <Input name="phone" value={formData.phone} onChange={handleChange} className={`border-border bg-background ${isRTL ? "text-right" : "text-left"}`} placeholder="+249..." />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t.employeesPassword} {isEditing && <span className="text-xs text-muted-foreground">{t.employeesPasswordHint}</span>}
              </label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className={`border-border bg-background ${isRTL ? "pl-10 text-right" : "pr-10 text-left"}`} placeholder={isEditing ? "••••••" : t.employeesPasswordPlaceholder} required={!isEditing} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-3" : "right-3"} text-muted-foreground hover:text-foreground`} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Work Details */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.employeesWorkDetails}</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.employeesRole}</label>
                <Select value={formData.role} onValueChange={(val) => setFormData((p) => ({ ...p, role: val }))}>
                  <SelectTrigger className={`h-12 rounded-xl border-border bg-background ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                    <SelectValue placeholder={t.employeesSelectRole}>
                      {formData.role === 'ADMIN' ? t.roleAdmin : formData.role === 'MANAGER' ? t.roleManager : t.roleCashier}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className={`rounded-xl border-border bg-popover text-popover-foreground ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                    <SelectItem value="ADMIN">{t.roleAdmin}</SelectItem>
                    <SelectItem value="MANAGER">{t.roleManager}</SelectItem>
                    <SelectItem value="CASHIER">{t.roleCashier}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1.5 rounded-lg border border-border bg-muted/50 p-2 text-[10px] leading-relaxed text-muted-foreground">
                   {formData.role === 'ADMIN' ? t.roleAdminDesc : formData.role === 'MANAGER' ? t.roleManagerDesc : t.roleCashierDesc}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.employeesDept}</label>
                <Select value={formData.department || "none"} onValueChange={(val) => setFormData((p) => ({ ...p, department: val === "none" ? "" : val }))}>
                  <SelectTrigger className={`border-border bg-background ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                    <SelectValue placeholder={t.employeesSelectDept}>{formData.department || (lang === 'ar' ? "لاشيء" : "None")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className={`border-border bg-popover text-popover-foreground ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                    <SelectItem value="none">{lang === 'ar' ? "لاشيء" : "None"}</SelectItem>
                    {departmentOptions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-700 dark:text-amber-500/90">{t.employeesMonthlySalary} ({t.currency})</label>
                <Input type="number" step="0.01" name="salary" value={formData.salary} onChange={handleChange} className={`border-border bg-background ${isRTL ? "text-right" : "text-left"}`} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.employeesHireDate}</label>
                <Input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} className={`border-border bg-background ${isRTL ? "text-right" : "text-left"}`} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pb-4 pt-8">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="hover:bg-muted">{t.cancel}</Button>
            <Button type="submit" disabled={loading} className="bg-amber-500 font-semibold text-black hover:bg-amber-600">
              {loading ? t.saving : t.employeesSaveEmployee}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
