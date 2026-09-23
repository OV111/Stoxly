import DecisionDetails from "@/components/journal/DecisionDetails";

type PageProps = {
  params: Promise<{ decisionId: string }>;
};

export default async function DecisionDetailPage({ params }: PageProps) {
  const { decisionId } = await params;
  return <DecisionDetails decisionId={decisionId} />;
}
