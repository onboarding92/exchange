import { router, publicProcedure } from "./trpc";
import { z } from "zod";
import { getTickers, getHistory, listSupportedAssets } from "./market";

export const marketRouter = router({
  // List current prices for all supported assets
  tickers: publicProcedure.query(async () => {
    const data = await getTickers();
    return {
      assets: listSupportedAssets(),
      tickers: data,
      fetchedAt: new Date().toISOString(),
    };
  }),

  // Get 24h history for one symbol (for charts)
  history: publicProcedure
    .input(
      z.object({
        symbol: z
          .string()
          .min(2)
          .max(10)
          .regex(/^[A-Z0-9]+$/i, "Invalid symbol"),
      })
    )
    .query(async ({ input }) => {
      const points = await getHistory(input.symbol.toUpperCase());
      return {
        symbol: input.symbol.toUpperCase(),
        points,
      };
    }),
});
