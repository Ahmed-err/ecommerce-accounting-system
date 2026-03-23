"use client";

import { useState } from "react";
import { User, Lock, Mail, Save, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "@/app/actions/user";

export default function SettingsClient({ user }) {
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
      setMessage({ type: "error", text: "كلمتا المرور الجديدتان لا تتطابقان" });
      setLoading(false);
      return;
    }

    const { confirmNewPassword, ...dataToSend } = formData;
    const res = await updateUserProfile(dataToSend);

    if (res.success) {
      setMessage({ type: "success", text: "تم تحديث الملف الشخصي بنجاح!" });
      setFormData({ ...formData, currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } else {
      setMessage({ type: "error", text: res.error || "فشل تحديث الملف الشخصي" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-10 text-right" dir="rtl">
      <div className="flex items-center gap-4">
        <div className="bg-amber-500/10 p-3 rounded-2xl">
          <User className="h-8 w-8 text-amber-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">إعدادات الحساب</h1>
          <p className="text-gray-400">إدارة ملفك الشخصي والأمان</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Info Section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <User className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-white">معلومات الملف الشخصي</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 mr-1">الاسم الأول</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-right"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 mr-1">الاسم الأخير</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-right"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-400 mr-1 flex items-center gap-2">
                <Mail className="h-3 w-3" /> البريد الإلكتروني (لا يمكن تغييره)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-gray-900/50 border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed outline-none text-right"
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Lock className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-white">الأمان وكلمة المرور</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 mr-1">كلمة المرور الحالية (مطلوب لإجراء تغييرات)</label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-right"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 mr-1">كلمة المرور الجديدة (اختياري)</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="اتركها فارغة للإبقاء عليها"
                  className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-right"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 mr-1">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  name="confirmNewPassword"
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                  placeholder="كرر كلمة المرور الجديدة"
                  className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-right"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-start pt-4">
          <Button 
            disabled={loading}
            className="px-8 py-6 bg-amber-500 hover:bg-amber-600 text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-2 group transition-all"
          >
            {loading ? "جاري الحفظ..." : (
              <>
                حفظ التغييرات
                <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
