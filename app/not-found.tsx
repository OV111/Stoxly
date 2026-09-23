import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>

      <p className="text-muted-foreground">
        The page you are looking for does not exist.
      </p>

      <Link
        href="/"
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
      >
        Go back home
      </Link>
    </div>
  );
}
