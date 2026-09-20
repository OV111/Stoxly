import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PortfolioPanel from "@/components/dashboard/PortfolioPanel";
import PortfolioHistoryPanel from "@/components/dashboard/PortfolioHistoryPanel";
import { WatchlistPanel } from "@/components/dashboard/WatchlistPanel";
import MoversPanel from "@/components/dashboard/MoversPanel";
import NewsPanel from "@/components/dashboard/NewsPanel";
import PortfolioSummary from "@/components/dashboard/PortfolioSummary";
import PortfolioRiskPanel from "@/components/dashboard/PortfolioRiskPanel";
import PortfolioAllocationPanel from "@/components/dashboard/PortfolioAllocationPanel";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-black px-4 py-8 md:px-8">
      <DashboardHeader />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Full-width hero */}
        <div className="lg:col-span-2">
          <PortfolioSummary />
        </div>

        {/* Dashboard panels */}
        <PortfolioPanel />
        <PortfolioHistoryPanel />

        <PortfolioAllocationPanel />
        <PortfolioRiskPanel />

        <WatchlistPanel />
        <MoversPanel />

        {/* Full-width */}
        <div className="lg:col-span-2">
          <NewsPanel />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
