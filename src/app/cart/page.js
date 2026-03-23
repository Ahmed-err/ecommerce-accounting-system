import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartClient from "@/components/store/CartClient";

export const metadata = {
  title: "Shopping Cart | PowerStore",
};

export default function CartPage() {
  return (
    <main className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-white mb-8">Shopping Cart</h1>
        <CartClient />
      </div>
      <Footer />
    </main>
  );
}
