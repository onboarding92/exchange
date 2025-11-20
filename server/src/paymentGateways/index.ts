import { GatewayAdapter } from "./types";

// Placeholder imports (real ones added in next steps)
import { moonpayAdapter } from "./moonpay";
import { changellyAdapter } from "./changelly";
import { banxaAdapter } from "./banxa";
import { transakAdapter } from "./transak";
import { mercuryoAdapter } from "./mercuryo";
import { coingateAdapter } from "./coingate";

const adapters: Record<string, GatewayAdapter> = {
  moonpay: moonpayAdapter,
  changelly: changellyAdapter,
  banxa: banxaAdapter,
  transak: transakAdapter,
  mercuryo: mercuryoAdapter,
  coingate: coingateAdapter,
};

export function getGateway(provider: string): GatewayAdapter {
  const key = provider.toLowerCase();
  const adapter = adapters[key];
  if (!adapter) {
    throw new Error(`Unknown payment provider: ${provider}`);
  }
  return adapter;
}

export function listGateways() {
  return Object.keys(adapters);
}
