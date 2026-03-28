"use client";

import { motion } from "framer-motion";

export function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="h-48 bg-gray-800 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-1/3" />
        <div className="h-6 bg-gray-700 rounded animate-pulse" />
        <div className="flex items-center justify-between pt-3">
          <div className="h-8 bg-gray-700 rounded animate-pulse w-1/2" />
          <div className="h-10 w-10 bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <section className="relative overflow-hidden bg-gray-950 pt-16 pb-24">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-gray-800 rounded-full animate-pulse w-48 mx-auto" />
          <div className="h-16 bg-gray-800 rounded animate-pulse" />
          <div className="h-16 bg-gray-800 rounded animate-pulse w-2/3 mx-auto" />
          <div className="h-6 bg-gray-800 rounded animate-pulse max-w-2xl mx-auto" />
          <div className="flex justify-center gap-4 pt-4">
            <div className="h-14 bg-gray-700 rounded-xl animate-pulse w-40" />
            <div className="h-14 bg-gray-700 rounded-xl animate-pulse w-40" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function SkeletonProductPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-800 rounded-2xl animate-pulse" />
        <div className="space-y-6">
          <div className="h-8 bg-gray-800 rounded animate-pulse w-1/3" />
          <div className="h-12 bg-gray-800 rounded animate-pulse" />
          <div className="h-6 bg-gray-800 rounded animate-pulse w-1/4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3" />
          </div>
          <div className="h-14 bg-gray-700 rounded-xl animate-pulse w-48" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCart() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4">
            <div className="h-20 w-20 bg-gray-800 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-800 rounded animate-pulse w-2/3" />
              <div className="h-4 bg-gray-800 rounded animate-pulse w-1/3" />
            </div>
            <div className="h-10 w-24 bg-gray-800 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-64 bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse" />
    </div>
  );
}

// Modern shimmer effect loader
export function Shimmer({ className = "" }) {
  return (
    <motion.div
      className={`relative overflow-hidden bg-gray-800 ${className}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

// Spinner loader
export function Spinner({ size = "md" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  return (
    <motion.div
      className={`${sizes[size]} border-2 border-amber-500/30 border-t-amber-500 rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}

// Dots loader
export function DotsLoader() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-amber-500 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

// Page loader
export function PageLoader({ text }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Spinner size="xl" />
        <motion.p
          className="text-gray-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {text || "Loading..."}
        </motion.p>
      </div>
    </div>
  );
}
