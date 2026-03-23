"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEmployee, updateEmployee } from "@/app/actions/employees";

const ROLES = ["ADMIN", "MANAGER", "CASHIER"];
const DEPARTMENTS = ["Management", "Sales", "Warehouse", "Support", "IT", "Finance"];

const today = () => new Date().toISOString().split("T")[0];

export default function EmployeeForm({ isOpen, onClose, employee }) {
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
        throw new Error("First and last name are required.");
      if (!formData.email.trim()) throw new Error("Email is required.");
      if (!isEditing && (!formData.password || formData.password.length < 6))
        throw new Error("Password must be at least 6 characters.");

      const res = isEditing
        ? await updateEmployee(employee.id, formData)
        : await createEmployee(formData);

      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Failed to save employee.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-gray-900 border-l border-white/10 text-white w-full sm:max-w-2xl overflow-y-auto pb-24">
        <SheetHeader>
          <SheetTitle className="text-white">
            {isEditing ? "Edit Employee" : "Add New Employee"}
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            {isEditing ? "Update employee details below." : "Fill in the details to add a new staff member."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 px-2 pb-6">
          {error && <div className="p-3 bg-red-500/20 text-red-400 rounded-md text-sm">{error}</div>}

          {/* Personal Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input name="firstName" value={formData.firstName} onChange={handleChange} required className="bg-gray-800 border-white/10" placeholder="John" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input name="lastName" value={formData.lastName} onChange={handleChange} required className="bg-gray-800 border-white/10" placeholder="Doe" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={isEditing} className="bg-gray-800 border-white/10 disabled:opacity-60" placeholder="john@powerstore.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone <span className="text-gray-600 text-xs">(optional)</span></label>
                <Input name="phone" value={formData.phone} onChange={handleChange} className="bg-gray-800 border-white/10" placeholder="+1 234 567 890" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Password {isEditing && <span className="text-gray-600 text-xs">(leave blank to keep current)</span>}
              </label>
              <Input type="password" name="password" value={formData.password} onChange={handleChange} className="bg-gray-800 border-white/10" placeholder={isEditing ? "••••••" : "Min 6 characters"} required={!isEditing} />
            </div>
          </div>

          {/* Work Details */}
          <div className="pt-2 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Work Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={formData.role} onValueChange={(val) => setFormData((p) => ({ ...p, role: val }))}>
                  <SelectTrigger className="bg-gray-800 border-white/10">
                    <SelectValue placeholder="Select role">{formData.role}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10 text-white">
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select value={formData.department || "none"} onValueChange={(val) => setFormData((p) => ({ ...p, department: val === "none" ? "" : val }))}>
                  <SelectTrigger className="bg-gray-800 border-white/10">
                    <SelectValue placeholder="Select department">{formData.department || "None"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-500/80">Monthly Salary ($)</label>
                <Input type="number" step="0.01" name="salary" value={formData.salary} onChange={handleChange} className="bg-gray-800 border-white/10" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hire Date</label>
                <Input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} className="bg-gray-800 border-white/10" />
              </div>
            </div>
          </div>

          <div className="pt-8 pb-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="hover:bg-white/10">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {loading ? "Saving..." : "Save Employee"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
