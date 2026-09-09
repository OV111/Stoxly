export type NavbarItem = {
  label: string;
  href: string;
};

export const navbarItems: NavbarItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  // { label: "Search", href: "/search" },
  { label: "Watchlist", href: "/watchlist" },
  { label: "Crypto", href: "/crypto" },
  { label: "News", href: "/news" },
  { label: "AI", href: "/ai" },
];
