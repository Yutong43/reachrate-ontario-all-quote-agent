import { marketRegistry } from "@/lib/market-registry";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(marketRegistry, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="ontario-market-registry.json"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}

