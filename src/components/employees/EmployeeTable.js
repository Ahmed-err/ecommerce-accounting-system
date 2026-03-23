"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, X, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import EmployeeForm from "./EmployeeForm";
import { deleteEmployee } from "@/app/actions/employees";

const ROLE_COLORS = {
  ADMIN: "bg-purple-500/10 text-purple-400",
  MANAGER: "bg-blue-500/10 text-blue-400",
  CASHIER: "bg-amber-500/10 text-amber-400",
};

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function EmployeeTable({ initialEmployees, total, departments, searchParams }) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchValue, setSearchValue] = useState(searchParamsHook.get("search") || "");
  const [mounted, setMounted] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const currentPage = Number(searchParamsHook.get("page")) || 1;
  const totalPages = Math.ceil(total / 10) || 1;

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsHook);
      if (val) params.set("search", val);
      else params.delete("search");
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
  };

  const clearSearch = () => {
    setSearchValue("");
    const params = new URLSearchParams(searchParamsHook);
    params.delete("search");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleFilter = (key, val, defaultVal) => {
    const params = new URLSearchParams(searchParamsHook);
    if (val && val !== defaultVal) params.set(key, val);
    else params.delete(key);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParamsHook);
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this employee?")) {
      await deleteEmployee(id);
    }
  };

  const openEdit = (emp) => { setEditingEmployee(emp); setIsFormOpen(true); };
  const openNew = () => { setEditingEmployee(null); setIsFormOpen(true); };

  return (
    <div className="bg-gray-900 border border-white/5 rounded-xl flex flex-col w-full h-full min-h-[500px]">
      {/* Filter Bar */}
      {mounted && (
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative group h-8 w-full md:w-64">
              <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-gray-500 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
              <Input
                placeholder="Search by name or email..."
                className="h-full pl-10 pr-10 bg-gray-800 border-white/10 text-white focus:border-amber-500/50 transition-all"
                value={searchValue}
                onChange={handleSearch}
              />
              {searchValue && (
                <button onClick={clearSearch} className="absolute right-3 inset-y-0 my-auto flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <Select
              value={searchParamsHook.get("role") || "all"}
              onValueChange={(val) => handleFilter("role", val, "all")}
            >
              <SelectTrigger className="w-[140px] bg-gray-800 border-white/10 text-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
              </SelectContent>
            </Select>

            {/* Department Filter */}
            <Select
              value={searchParamsHook.get("department") || "all"}
              onValueChange={(val) => handleFilter("department", val, "all")}
            >
              <SelectTrigger className="w-[160px] bg-gray-800 border-white/10 text-white">
                <SelectValue placeholder="Department">
                  {searchParamsHook.get("department") && searchParamsHook.get("department") !== "all"
                    ? searchParamsHook.get("department")
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full min-w-[900px] text-left text-sm text-gray-300">
          <thead className="bg-gray-800/50 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium">Employee</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Department</th>
              <th className="px-6 py-4 font-medium">Salary</th>
              <th className="px-6 py-4 font-medium">Hire Date</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {initialEmployees.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                  No employees found.
                </td>
              </tr>
            )}
            {initialEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center border border-white/5 text-xs font-bold text-amber-500 uppercase shrink-0">
                      {emp.firstName?.[0]}{emp.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-medium text-white">{emp.firstName} {emp.lastName}</div>
                      <div className="text-xs text-gray-500">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[emp.role] || "bg-gray-500/10 text-gray-400"}`}>
                    <Shield className="h-3 w-3" />
                    {emp.role.charAt(0) + emp.role.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400">{emp.department || "—"}</td>
                <td className="px-6 py-4">
                  {emp.salary ? (
                    <span className="text-emerald-400 font-mono font-semibold">${emp.salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-400 whitespace-nowrap">{formatDate(emp.hireDate)}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} className="text-gray-400 hover:text-white">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="text-gray-400 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400">
        <div>
          Showing <span className="text-white font-medium">{initialEmployees.length > 0 ? (currentPage - 1) * 10 + 1 : 0}</span> to{" "}
          <span className="text-white font-medium">{Math.min(currentPage * 10, total)}</span> of{" "}
          <span className="text-white font-medium">{total}</span> results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            className="bg-gray-800 border-white/10 text-white hover:bg-gray-700 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="px-4 py-1.5 bg-gray-800 rounded-md border border-white/10 text-white font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline" size="sm"
            className="bg-gray-800 border-white/10 text-white hover:bg-gray-700 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <EmployeeForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          employee={editingEmployee}
        />
      )}
    </div>
  );
}
