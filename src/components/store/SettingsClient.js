"use client";

import { useState } from "react";
import { User, Lock, Mail, Save, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "@/app/actions/user";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function SettingsClient({ user }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    phone: user.phone || "",
    avatar: user.avatar || "user",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
      setMessage({ type: "error", text: t.settingsPasswordsNoMatch });
      setLoading(false);
      return;
    }

    const { confirmNewPassword, ...dataToSend } = formData;
    const res = await updateUserProfile(dataToSend);

    if (res.success) {
      setMessage({ type: "success", text: t.settingsUpdateSuccess });
      setFormData({ ...formData, currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } else {
      setMessage({ type: "error", text: res.error || t.settingsUpdateError });
    }
    setLoading(false);
  };

  return (
    <div className={`space-y-12 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Profile Hub Header */}
      <div className="relative overflow-hidden bg-gray-900 border border-white/5 rounded-[40px] p-8 md:p-12 mb-8 group hover:bg-white/[0.02] transition-all duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] -mr-32 -mt-32 opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -ml-32 -mb-32 opacity-20 group-hover:opacity-40 transition-opacity" />

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
             <div className="relative group/avatar">
                 <div className="h-40 w-40 rounded-[32px] bg-gray-800 border-2 border-white/10 flex items-center justify-center p-8 group-hover/avatar:border-amber-500/50 transition-all duration-300">
                    <User className="h-full w-full text-amber-500" />
                 </div>
                 <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border-4 border-gray-900">
                    {user.role}
                 </div>
             </div>

             <div className="flex-1 text-center md:text-start">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                   {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-400 text-lg mb-6 max-w-lg">
                   {user.email}
                </p>
                <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                   <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 font-medium">
                      Sudan, Khartoum
                   </span>
                   <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 font-medium regular-nums">
                      {user.phone || t.noPhone}
                   </span>
                </div>
             </div>
          </div>
      </div>

      {message.text && (
        <div className={`p-6 rounded-[24px] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          <span className="text-base font-bold tracking-tight">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Info Section */}
        <div className="bg-gray-900 border border-white/10 rounded-[40px] p-8 md:p-12 space-y-10 group/card hover:bg-white/[0.01] transition-all duration-500">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-amber-500" />
                <h2 className="text-2xl font-black text-white">{t.settingsProfileInfo}</h2>
             </div>
             <p className="text-gray-400 text-sm opacity-60 ml-9">{lang ==='ar' ? 'تحديث معلوماتك الشخصية وصورة الحساب.' : 'Update your personal information and profile picture.'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-widest px-1">{t.employeesFirstName}</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:border-amber-500 group-hover/card:bg-gray-800/80 transition-all outline-none ${isRTL ? 'text-right' : 'text-left'} font-semibold`}
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-widest px-1">{t.employeesLastName}</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:border-amber-500 group-hover/card:bg-gray-800/80 transition-all outline-none ${isRTL ? 'text-right' : 'text-left'} font-semibold`}
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-widest px-1">{lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+249..."
                className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:border-amber-500 group-hover/card:bg-gray-800/80 transition-all outline-none ${isRTL ? 'text-right' : 'text-left'} font-semibold regular-nums`}
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <Mail className="h-3 w-3" /> {t.settingsEmailFixed}
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className={`w-full bg-gray-950/50 border-2 border-white/5 rounded-2xl px-6 py-4 text-gray-600 cursor-not-allowed outline-none ${isRTL ? 'text-right' : 'text-left'} font-medium`}
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-gray-900 border border-white/10 rounded-[40px] p-8 md:p-12 space-y-10 group/sec hover:bg-white/[0.01] transition-all duration-500">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-amber-500" />
                <h2 className="text-2xl font-black text-white">{t.settingsSecurity}</h2>
             </div>
             <p className="text-gray-400 text-sm opacity-60 ml-9">{lang ==='ar' ? 'تأمين حسابك بكلمة مرور قوية.' : 'Secure your account with a strong password.'}</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-3 max-w-md">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-widest px-1">{t.settingsCurrentPassword}</label>
              <div className="relative">
                <input
                  type={showPasswords.currentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl px-6 py-4 ${isRTL ? "pl-12" : "pr-12"} text-white placeholder:text-gray-600 focus:border-amber-500 group-hover/sec:bg-gray-800/80 transition-all outline-none ${isRTL ? 'text-right' : 'text-left'} font-semibold`}
                />
                <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, currentPassword: !p.currentPassword }))} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-4" : "right-4"} text-gray-400 hover:text-amber-500`} aria-label={showPasswords.currentPassword ? "Hide password" : "Show password"}>
                  {showPasswords.currentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-300 uppercase tracking-widest px-1">{t.settingsNewPassword}</label>
                <div className="relative">
                  <input
                    type={showPasswords.newPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder={t.settingsNewPasswordPlaceholder}
                    className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl px-6 py-4 ${isRTL ? "pl-12" : "pr-12"} text-white placeholder:text-gray-600 focus:border-amber-500 group-hover/sec:bg-gray-800/80 transition-all outline-none ${isRTL ? 'text-right' : 'text-left'} font-semibold`}
                  />
                  <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, newPassword: !p.newPassword }))} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-4" : "right-4"} text-gray-400 hover:text-amber-500`} aria-label={showPasswords.newPassword ? "Hide password" : "Show password"}>
                    {showPasswords.newPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-300 uppercase tracking-widest px-1">{t.settingsConfirmPassword}</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirmNewPassword ? "text" : "password"}
                    name="confirmNewPassword"
                    value={formData.confirmNewPassword}
                    onChange={handleChange}
                    placeholder={t.settingsConfirmPasswordPlaceholder}
                    className={`w-full bg-gray-800 border-2 border-transparent rounded-2xl px-6 py-4 ${isRTL ? "pl-12" : "pr-12"} text-white placeholder:text-gray-600 focus:border-amber-500 group-hover/sec:bg-gray-800/80 transition-all outline-none ${isRTL ? 'text-right' : 'text-left'} font-semibold`}
                  />
                  <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, confirmNewPassword: !p.confirmNewPassword }))} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-4" : "right-4"} text-gray-400 hover:text-amber-500`} aria-label={showPasswords.confirmNewPassword ? "Hide password" : "Show password"}>
                    {showPasswords.confirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} pt-8`}>
          <Button 
            disabled={loading}
            className="px-12 py-8 bg-amber-500 hover:bg-amber-600 text-black font-black text-xl rounded-full flex items-center justify-center gap-3 group transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-amber-500/20"
          >
            {loading ? t.saving : (
              <>
                {t.settingsSaveChanges}
                <Save className="h-6 w-6 group-hover:rotate-12 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
