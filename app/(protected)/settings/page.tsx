import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import SettingsForm from "@/components/settings/SettingsForm";
import ExchangeConnections from "@/components/settings/ExchangeConnections";

const SettingsPage = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen home-wrapper px-4 py-8 md:px-8">
      <div className="max-w-xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Manage your account details and security.
          </p>
        </div>

        <SettingsForm
          name={user.name}
          email={user.email}
          hasPassword={user.hasPassword}
          isGoogleLinked={user.isGoogleLinked}
          createdAt={user.createdAt.toISOString()}
        />

        <ExchangeConnections />
      </div>
    </div>
  );
};

export default SettingsPage;
