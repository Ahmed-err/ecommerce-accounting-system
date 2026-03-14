// page.js — The HOMEPAGE of our electrical supplies store
// This file maps to the URL: localhost:3000/
//
// HOW IT WORKS:
// Next.js sees this file at src/app/page.js and makes it the homepage.
// It gets wrapped inside layout.js automatically (which adds <html>, <body>, fonts, etc.)
//
// We import our components and stack them vertically — that's it!
// Each component is a self-contained piece of UI.

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import FeaturedProducts from "@/components/FeaturedProducts";
import Footer from "@/components/Footer";
// ☝️ @/ is a shortcut for the "src/" folder (configured in jsconfig.json)
// So @/components/Navbar = src/components/Navbar.js

export default function Home() {
  return (
    // We stack the components vertically — they render in order, top to bottom
    <main className="min-h-screen bg-gray-950">
      <Navbar />
      <Hero />
      <Categories />
      <FeaturedProducts />
      <Footer />
    </main>
    // ☝️ That's component composition!
    // Each component handles its own layout, styles, and logic.
    // The page just decides WHICH components to show and in WHAT ORDER.
  );
}
