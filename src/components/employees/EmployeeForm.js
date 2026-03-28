"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEmployee, updateEmployee } from "@/app/actions/employees";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

const ROLES = ["ADMIN", "MANAGER", "CASHIER"];
const DEPARTMENTS = ["Management", "Sales", "Warehouse", "Support", "IT", "Finance"];

const today = () => new Date().toISOString().split("T")[0];

export default function EmployeeForm({ isOpen, onClose, employee }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const isEditing = !!employee;

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    password: "", role: "CASHIER", department: "",
    salary: "", hireDate: today(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={isRTL ? "right" : "left"} className={`bg-gray-900 border-white/10 text-white w-full sm:max-w-2xl overflow-y-auto pb-24 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
        <SheetHeader>
          <SheetTitle className={`text-white ${isRTL ? 'text-right' : 'text-left'}`}>
            {isEditing ? t.employeesEditEmployeeHeader : t.employeesAddNewEmployeeHeader}
          </SheetTitle>
          <SheetDescription className={`text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isEditing ? t.employeesUpdateDetails : t.employeesFillDetails}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 px-2 pb-6">
          {error && <div className="p-3 bg-red-500/20 text-red-400 rounded-md text-sm">{error}</div>}

          {/* Personal Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t.employeesPersonalInfo}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.employeesFirstName}</label>
                <Input name="firstName" value={formData.firstName} onChange={handleChange} required className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} placeholder={lang === 'ar' ? "مثال: أحمد" : "John"} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.employeesLastName}</label>
                <Input name="lastName" value={formData.lastName} onChange={handleChange} required className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} placeholder={lang === 'ar' ? "مثال: علي" : "Doe"} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.employeesEmail}</label>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={isEditing} className={`bg-gray-800 border-white/10 disabled:opacity-60 ${isRTL ? 'text-right' : 'text-left'}`} placeholder="admin@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.employeesPhone} <span className="text-gray-600 text-xs">{t.optional}</span></label>
                <Input name="phone" value={formData.phone} onChange={handleChange} className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} placeholder="+249..." />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t.employeesPassword} {isEditing && <span className="text-gray-600 text-xs">{t.employeesPasswordHint}</span>}
              </label>
              <Input type="password" name="password" value={formData.password} onChange={handleChange} className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} placeholder={isEditing ? "••••••" : t.employeesPasswordPlaceholder} required={!isEditing} />
            </div>
          </div>

          {/* Work Details */}
          <div className="pt-2 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t.employeesWorkDetails}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.employeesRole}</label>
                <Select value={formData.role} onValueChange={(val) => setFormData((p) => ({ ...p, role: val }))}>
                  <SelectTrigger className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'} h-12 rounded-xl`} dir={isRTL ? "rtl" : "ltr"}>
                    <SelectValue placeholder={t.employeesSelectRole}>
                      {formData.role === 'ADMIN' ? t.roleAdmin : formData.role === 'MANAGER' ? t.roleManager : t.roleCashier}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className={`bg-gray-800 border-white/10 text-white rounded-xl ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
                    <SelectItem value="ADMIN">{t.roleAdmin}</SelectItem>
                    <SelectItem value="MANAGER">{t.roleManager}</SelectItem>
                    <SelectItem value="CASHIER">{t.roleCashier}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5">
                   {formData.role === 'ADMIN' ? t.roleAdminDesc : formData.role === 'MANAGER' ? t.roleManagerDesc : t.roleCashierDesc}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.employeesDept}</label>
                <Select value={formData.department || "none"} onValueChange={(val) => setFormData((p) => ({ ...p, department: val === "none" ? "" : val }))}>
                  <SelectTrigger className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
                    <SelectValue placeholder={t.employeesSelectDept}>{formData.department || (lang === 'ar' ? "لاشيء" : "None")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className={`bg-gray-800 border-white/10 text-white ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
                    <SelectItem value="none">{lang === 'ar' ? "لاشيء" : "None"}</SelectItem>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium text-amber-500/80`}>{t.employeesMonthlySalary} ({t.currency})</label>
                <Input type="number" step="0.01" name="salary" value={formData.salary} onChange={handleChange} className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.employeesHireDate}</label>
                <Input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} className={`bg-gray-800 border-white/10 ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
            </div>
          </div>

          <div className="pt-8 pb-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="hover:bg-white/10">{t.cancel}</Button>
            <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {loading ? t.saving : t.employeesSaveEmployee}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
