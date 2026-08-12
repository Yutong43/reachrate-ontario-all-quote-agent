import { QuoteWorkspace } from "@/components/quote-workspace";
import { getRegistryStats } from "@/lib/market-registry";

type HomeProps = {
  searchParams: Promise<{ scene?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const requestedScene = Array.isArray(params.scene) ? params.scene[0] : params.scene;
  const initialScene = ["plan", "search", "compare", "callback"].includes(requestedScene ?? "")
    ? (requestedScene as "plan" | "search" | "compare" | "callback")
    : "profile";

  return (
    <QuoteWorkspace
      registryStats={getRegistryStats()}
      initialScene={initialScene}
    />
  );
}
