// RPC endpoints per network, with fallback.
//
// Why this exists: the primary Robinhood RPC endpoints are not equally reachable.
// On an Indonesian ISP `rpc.mainnet.chain.robinhood.com` resolves to a national
// block page (`internetsehat.iconpln.net.id`) and its certificate chain was
// expired on 2026-11-20, and the testnet explorer serves an invalid CA. A single
// hardcoded endpoint therefore turns "I cannot reach the node" into "the
// contracts are not deployed" — which is a lie the UI must never tell.
//
// Extra endpoints can be injected at build time, comma separated:
//   VITE_RPC_46630_EXTRA=https://a.example,https://b.example

export type NetworkKey = 'testnet' | 'mainnet';

const dedupe = (urls: string[]): string[] =>
  [...new Set(urls.map((u) => u.trim()).filter(Boolean))];

const splitEnv = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http'));

export const RPC_ENDPOINTS: Record<NetworkKey, string[]> = {
  testnet: dedupe([
    'https://rpc.testnet.chain.robinhood.com',
    ...splitEnv(import.meta.env.VITE_RPC_46630_EXTRA),
  ]),
  mainnet: dedupe([
    '/api/rpc-mainnet',
    'https://rpc.mainnet.chain.robinhood.com',
    ...splitEnv(import.meta.env.VITE_RPC_4663_EXTRA),
  ]),
};

export const EXPECTED_CHAIN_ID: Record<NetworkKey, number> = {
  testnet: 46630,
  mainnet: 4663,
};