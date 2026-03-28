"use client";

import { 
  Eye, CheckCircle2, Truck, Package, XCircle, Clock, 
  Search, Filter, Printer, ChevronDown, ChevronUp, 
  User, MapPin, Phone, Mail, ShoppingCart, ShoppingBag 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { updateOrderStatus } from "@/app/actions/catalog";

const STATUS_CONFIG = {
  PENDING: { color: "bg-amber-500/10 text-amber-500", icon: Clock },
  PROCESSING: { color: "bg-blue-500/10 text-blue-500", icon: Package },
  SHIPPED: { color: "bg-indigo-500/10 text-indigo-500", icon: Truck },
  DELIVERED: { color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
  CANCELLED: { color: "bg-rose-500/10 text-rose-500", icon: XCircle },
};

export default function OrderTable({ initialOrders, total, searchParams }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [orders, setOrders] = useState(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [statusError, setStatusError] = useState("");

  const handleStatusChange = async (orderId, newStatus) => {
    setStatusError("");
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } else {
      setStatusError(res.error || "Failed to update status");
    }
  };

  const toggleExpand = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) newExpanded.delete(orderId);
    else newExpanded.add(orderId);
    setExpandedOrders(newExpanded);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.guestEmail || order.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.guestName || (order.user ? `${order.user.firstName} ${order.user.lastName}` : "")).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.guestPhone || "").includes(searchTerm);
      
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === "PENDING").length,
      processing: orders.filter(o => o.status === "PROCESSING").length,
      delivered: orders.filter(o => o.status === "DELIVERED").length,
    };
  }, [orders]);

  const getStatusLabel = (s) => {
    if (s === "PENDING") return t.adminStatusPending;
    if (s === "PROCESSING") return t.adminStatusProcessing;
    if (s === "SHIPPED") return t.adminStatusShipped;
    if (s === "DELIVERED") return t.adminStatusDelivered;
    if (s === "CANCELLED") return t.adminStatusCancelled;
    return s;
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right font-arabic' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
      {statusError && (
        <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm flex items-center justify-between">
          <span>{statusError}</span>
          <button onClick={() => setStatusError("")} className="text-red-400 hover:text-red-300 ml-2">✕</button>
        </div>
      )}
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.adminTotalOrders, value: stats.total, color: "text-blue-500", bg: "bg-blue-500/10", icon: ShoppingCart },
          { label: t.adminStatusPending, value: stats.pending, color: "text-amber-500", bg: "bg-amber-500/10", icon: Clock },
          { label: t.adminStatusProcessing, value: stats.processing, color: "text-indigo-500", bg: "bg-indigo-500/10", icon: Package },
          { label: t.adminStatusDelivered, value: stats.delivered, color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 },
        ].map((item, i) => (
          <div key={i} className="bg-gray-900 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
            <div className={`p-2 rounded-lg ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900 border border-white/5 rounded-2xl p-4">
        <div className="relative w-full md:w-96 group">
          <Search className={`absolute inset-y-0 ${isRTL ? 'right-3' : 'left-3'} my-auto h-4 w-4 text-gray-500 group-focus-within:text-amber-500 transition-colors`} />
          <input 
            type="text"
            className={`w-full bg-gray-800/50 border border-white/5 rounded-xl ${isRTL ? 'pr-10' : 'pl-10'} py-2.5 text-sm text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all`}
            placeholder={lang === 'ar' ? "بحث في الطلبات..." : "Search orders..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-gray-500" />
          <select 
            className="flex-1 md:w-48 bg-gray-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 transition-all cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">{lang === 'ar' ? "جميع الحالات" : "All Statuses"}</option>
            <option value="PENDING">{t.adminStatusPending}</option>
            <option value="PROCESSING">{t.adminStatusProcessing}</option>
            <option value="SHIPPED">{t.adminStatusShipped}</option>
            <option value="DELIVERED">{t.adminStatusDelivered}</option>
            <option value="CANCELLED">{t.adminStatusCancelled}</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/30 text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-white/5">
              <tr>
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">{t.adminOrderNumber}</th>
                <th className="px-6 py-4">{t.adminCustomer}</th>
                <th className="px-6 py-4">{t.adminOrderDate}</th>
                <th className="px-6 py-4">{t.adminStatus}</th>
                <th className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>{t.adminTotal}</th>
                <th className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 italic">
                    <div className="flex flex-col items-center gap-2">
                       <ShoppingBag className="h-8 w-8 opacity-20" />
                       {t.adminNoOrdersFound}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = status.icon;
                  const isExpanded = expandedOrders.has(order.id);

                  return (
                    <React.Fragment key={order.id}>
                      <tr className={`${isExpanded ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'} transition-colors group cursor-pointer`} onClick={() => toggleExpand(order.id)}>
                        <td className="px-6 py-4">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-amber-500" /> : <ChevronDown className="h-4 w-4 text-gray-600 group-hover:text-gray-400" />}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                            #{order.id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-white">{order.guestName || (order.user ? `${order.user.firstName} ${order.user.lastName}` : "Guest")}</span>
                            <span className="text-xs text-gray-500">{order.guestEmail || order.user?.email}</span>
                            {(order.guestPhone || order.guestCity) && (
                              <span className="text-[10px] text-amber-500/70">
                                {order.guestPhone} {order.guestCity && `• ${order.guestCity}`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.color} border border-current opacity-90`}>
                            <StatusIcon className="h-3 w-3" />
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 font-mono font-bold text-white whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}>
                          {order.totalAmount.toLocaleString()} {t.currency}
                        </td>
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                            <select 
                              className="bg-gray-800 border border-white/10 rounded-lg text-[10px] px-2 py-1.5 text-white outline-none focus:border-amber-500 transition-all cursor-pointer hover:bg-gray-700"
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            >
                              <option value="PENDING">{t.adminStatusPending}</option>
                              <option value="PROCESSING">{t.adminStatusProcessing}</option>
                              <option value="SHIPPED">{t.adminStatusShipped}</option>
                              <option value="DELIVERED">{t.adminStatusDelivered}</option>
                              <option value="CANCELLED">{t.adminStatusCancelled}</option>
                            </select>
                            <Link href={`/admin/orders/${order.id}/invoice`} target="_blank">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Expansion Panel */}
                      {isExpanded && (
                        <tr className="bg-gray-800/20 border-b border-white/5">
                          <td colSpan="7" className="px-12 py-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white">
                              {/* Buyer Info */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                  <User className="h-4 w-4" /> {lang === 'ar' ? 'معلومات العميل' : 'Customer Details'}
                                </h4>
                                <div className="space-y-2 text-sm bg-white/5 p-4 rounded-xl border border-white/5">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">{t.fullName}:</span>
                                    <span className="font-semibold">{order.guestName || (order.user ? `${order.user.firstName} ${order.user.lastName}` : "Guest")}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">{t.email}:</span>
                                    <span className="font-semibold">{order.guestEmail || order.user?.email}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}:</span>
                                    <span className="font-semibold">{order.guestPhone || "—"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">{lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}:</span>
                                    <span className="font-semibold text-amber-500">{order.paymentMethod}</span>
                                  </div>
                                  <div className="pt-2 border-t border-white/5 flex gap-2">
                                    <MapPin className="h-4 w-4 text-amber-500" />
                                    <div>
                                      <p className="font-bold text-xs">{order.guestCity}</p>
                                      <p className="text-xs text-gray-400 mt-1">{order.guestAddress}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Order Items */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                  <ShoppingCart className="h-4 w-4" /> {lang === 'ar' ? 'منتجات الطلب' : 'Ordered Items'}
                                </h4>
                                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                  {order.items?.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                      <div className="h-10 w-10 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden">
                                        {item.product?.images?.[0] ? <img src={item.product.images[0]} alt="" className="object-cover h-full w-full" /> : <Package className="h-4 w-4 opacity-30" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold truncate">{item.product?.name}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">SKU: {item.product?.sku}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-bold">{item.price.toLocaleString()} {t.currency}</p>
                                        <p className="text-[10px] text-gray-500">×{item.quantity}</p>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="bg-amber-500/10 p-3 flex justify-between items-center mt-2 border-t border-amber-500/20">
                                    <span className="text-xs font-bold text-amber-500">{t.grandTotal}</span>
                                    <span className="font-bold text-amber-500">{order.totalAmount.toLocaleString()} {t.currency}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
