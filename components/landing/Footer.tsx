import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import type { CurrentUser } from "@/lib/getCurrentUser";

type FooterLink = { label: string; href: string };

const PRODUCT_LINKS: FooterLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Watchlist", href: "/watchlist" },
  { label: "Journal", href: "/journal" },
  { label: "Intelligence", href: "/intelligence" },
];

const MARKET_LINKS: FooterLink[] = [
  { label: "Search Stocks", href: "/search" },
  { label: "Crypto", href: "/crypto" },
  { label: "Market News", href: "/news" },
  { label: "Alerts", href: "/alerts" },
];

const FooterColumn = ({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) => {
  const headingId = `footer-${title.toLowerCase()}`;

  return (
    <nav aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3
        id={headingId}
        className="text-gray-400 font-semibold text-sm uppercase tracking-wider"
      >
        {title}
      </h3>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="footer-link text-sm">
          {link.label}
        </Link>
      ))}
    </nav>
  );
};

const Footer = ({ user }: { user: CurrentUser | null }) => {
  const accountLinks: FooterLink[] = user
    ? [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/settings" },
        { label: "Billing", href: "/billing" },
      ]
    : [
        { label: "Sign In", href: "/sign-in" },
        { label: "Get Started", href: "/sign-up" },
      ];

  return (
    <footer className="w-full border-t border-gray-800">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <Logo iconSize="size-6" animateText />
            <p className="text-gray-600 text-xs leading-relaxed">
              Stoxly is a portfolio tracking and research tool provided for
              informational purposes only.
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Markets" links={MARKET_LINKS} />
          <FooterColumn title="Account" links={accountLinks} />
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-gray-500 text-xs">
              {`© ${new Date().getFullYear()} Stoxly. All rights reserved.`}
            </p>
            <p className="text-gray-600 text-xs">
              Market data by <span className="text-gray-500">Finnhub</span>,{" "}
              <span className="text-gray-500">CoinGecko</span> &{" "}
              <span className="text-gray-500">TradingView</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
