import { cookies } from "next/headers";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminPanel from "@/components/admin/AdminPanel";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminAuth";

export const metadata = {
  title: "Admin Dashboard | Al Qirat Perfumes",
  description: "Secure Al Qirat Perfumes administration portal.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const adminSections = new Set([
  "dashboard",
  "categories",
  "products",
  "orders",
  "customers",
  "reviews",
  "inquiries",
  "subscribers",
  "custom-perfume",
  "hero-slides",
  "announcements",
  "delivery",
  "faqs",
]);

export default function AdminPage({ searchParams }) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = verifyAdminSessionToken(token);
  const requestedSection = typeof searchParams?.section === "string" ? searchParams.section : "dashboard";
  const initialSection = adminSections.has(requestedSection) ? requestedSection : "dashboard";

  return authenticated ? <AdminPanel initialSection={initialSection} /> : <AdminLogin />;
}

