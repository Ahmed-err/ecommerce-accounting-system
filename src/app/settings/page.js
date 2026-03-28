import { auth } from "@/auth";
import { getUserProfile } from "@/app/actions/user";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SettingsClient from "@/components/store/SettingsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Account Settings | Essam Nasreddin Electrical Tools",
};

export default async function SettingsPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  const user = await getUserProfile();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SettingsClient user={user} />
      </div>
      <Footer />
    </main>
  );
}
