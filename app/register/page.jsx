import CustomerAuth from "@/components/CustomerAuth";

export const metadata = {
  title: "Create Account | Al Qirat Perfumes",
};

export default function RegisterPage({ searchParams }) {
  const nextPath = typeof searchParams?.next === "string" && searchParams.next.startsWith("/")
    ? searchParams.next
    : "/checkout";

  return <CustomerAuth nextPath={nextPath} initialMode="register" />;
}
