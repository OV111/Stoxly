export type NavbarItem = {
  label: string;
  href: string;
};

export const navbarItems: NavbarItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Billing", href: "/billing" },
  // { label: "Search", href: "/search" },
  { label: "Watchlist", href: "/watchlist" },
  { label: "Crypto", href: "/crypto" },
  // { label: "News", href: "/news" },
  {label:"Intelligence",href:"/intelligence"},
  // { label: "AI", href: "/ai" },
];
