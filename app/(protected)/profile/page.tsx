import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { connectDB } from "@/lib/mongoose";
import Transaction from "@/models/Transactions";
import { InvestmentDecision } from "@/models/InvestmentDecision";
import { InvestmentNote } from "@/models/InvestmentNote";
import { buildHoldings } from "@/lib/analytics/engines/holdings-engine";
import UserAvatar from "@/components/ui/UserAvatar";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 flex flex-col gap-1">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-xl font-semibold text-gray-100">{value}</p>
  </div>
);

const ProfilePage = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  await connectDB();

  const [transactions, decisionCount, noteCount] = await Promise.all([
    Transaction.find({ userId: user.id }),
    InvestmentDecision.countDocuments({ userId: user.id }),
    InvestmentNote.countDocuments({ userId: user.id }),
  ]);

  const holdings = buildHoldings(transactions);
  const openHoldings = holdings.filter((h) => h.totalQuantity > 0);
  const totalInvested = openHoldings.reduce((sum, h) => sum + h.totalCostBasis, 0);

  return (
    <div className="min-h-screen home-wrapper px-4 py-8 md:px-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.name} size="md" />
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{user.name}</h1>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <p className="text-gray-600 text-xs mt-1">Member since {formatDate(user.createdAt)}</p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Portfolio
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Open Holdings" value={String(openHoldings.length)} />
            <StatCard label="Transactions Logged" value={String(transactions.length)} />
            <StatCard label="Total Invested" value={formatCurrency(totalInvested)} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Investment Memory
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Decisions Logged" value={String(decisionCount)} />
            <StatCard label="Quick Notes" value={String(noteCount)} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-200">Account settings</p>
            <p className="text-xs text-gray-500 mt-0.5">Update your name, password, or linked accounts.</p>
          </div>
          <Link
            href="/settings"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors shrink-0"
          >
            Go to Settings →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
