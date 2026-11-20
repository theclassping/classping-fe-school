import SubscriptionScreen from "@/features/subscription/components/SubscriptionScreen";

/** `?plan=starter` comes from the "Pilih paket" buttons on the landing page. */
export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ plan?: string | string[] }> }) {
  const { plan } = await searchParams;
  return <SubscriptionScreen initialPlan={typeof plan === "string" ? plan : undefined} />;
}
