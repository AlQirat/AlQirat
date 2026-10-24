import CustomerAuth from "@/components/CustomerAuth";

export const metadata = {
  title: "Customer Login | Al Qirat Perfumes",
};

export default function LoginPage({ searchParams }) {
  const nextPath = typeof searchParams?.next === "string" && searchParams.next.startsWith("/")
    ? searchParams.next
    : "/checkout";

  const initialError = searchParams?.error === "confirmation"
    ? "That confirmation link is invalid or has expired. Please sign in or register again."
    : "";

  return <CustomerAuth nextPath={nextPath} initialError={initialError} />;
}
