import { TrendingUp, Star, Newspaper, Bitcoin, type LucideIcon } from "lucide-react";

type Feature = {
  /** Component reference, not a rendered element, so sizing stays defined in one place. */
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    Icon: TrendingUp,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    title: "Real-Time Prices",
    description:
      "Live stock data updated instantly. Track price movements, percentage changes, and market trends as they happen.",
  },
  {
    Icon: Star,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-500/10",
    title: "Smart Watchlist",
    description:
      "Save and monitor the stocks that matter to you. Set price alerts and never miss a market move.",
  },
  {
    Icon: Newspaper,
    iconColor: "text-teal-400",
    iconBg: "bg-teal-500/10",
    title: "Market News",
    description:
      "Stay informed with the latest financial news and insights, filtered by the stocks you follow.",
  },
  {
    Icon: Bitcoin,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/10",
    title: "Crypto Markets",
    description:
      "Track Bitcoin, Ethereum, and top altcoins alongside your stocks — all in one unified dashboard.",
  },
];

const Summary = () => {
  return (
    <section
      aria-labelledby="summary-heading"
      className="container py-14 sm:py-20"
    >
      <div className="text-center mb-10 sm:mb-12">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-blue-400">
          The toolkit
        </p>
        <h2
          id="summary-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3"
        >
          Everything you need to track the market
        </h2>
        <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
          Stoxly gives you the tools to stay on top of your investments —
          simple, fast, and always live.
        </p>
      </div>

      {/* 1 col on phones, 2×2 from sm, 4-across from lg — never stacked on desktop. */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map(({ Icon, iconColor, iconBg, title, description }) => (
          <li
            key={title}
            /* Border-brightening on hover is the app's established interactive
               language (NewsCard, DecisionTimeline, NewsPanel) — no lift or
               shadow is used anywhere else, so none is introduced here. */
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gray-800/40 p-6 transition-colors hover:border-white/20 hover:bg-gray-800/70"
          >
            <div
              aria-hidden="true"
              className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconBg}`}
            >
              <Icon className={`size-6 ${iconColor}`} />
            </div>
            <h3 className="text-white font-semibold text-lg">{title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              {description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Summary;
