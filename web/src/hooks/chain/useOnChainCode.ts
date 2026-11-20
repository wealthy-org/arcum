// On-chain verification of the contract register.
//
// The register used to be a static list: whatever `deployments/*.json` said, the
// page repeated. When a build shipped without those addresses — or when the page
// could not reach the chain — the register rendered "Belum dideploy" for
// contracts that were in fact live on chain 46630. That is the failure this hook
// removes: the page now asks the chain, and distinguishes three states.
//
//   active   bytecode present at the address  -> verifiable, links to explorer
//   empty    node answered 0x                -> genuinely not deployed
//   unknown  no endpoint answered            -> NOT the same as "not deployed"
//
// `unknown` is rendered as an RPC/reachability problem, never as absence.

import { useEffect, useRef, useState } from 'react';
import { EXPECTED_CHAIN_ID, RPC_ENDPOINTS, type NetworkKey } from '../../data/rpc';

export type CodeStatus = 'active' | 'empty' | 'unknown';

export interface CodeCheck {
  address: string;
  status: CodeStatus;
  bytes: number;
  error?: string;
}

export interface ChainReport {
  network: NetworkKey;
  expectedChainId: number;
  chainId: number | null;
  block: number | null;
  rpcUrl: string | null;
  attempts: { url: string; ok: boolean; ms: number; reason?: string }[];
  results: CodeCheck[];
  active: number;
  empty: number;
  unknown: number;
  checkedAt: number | null;
  loading: boolean;
}

const RPC_TIMEOUT_MS = 9000;

const emptyReport = (network: NetworkKey): ChainReport => ({
  network,
  expectedChainId: EXPECTED_CHAIN_ID[network],
  chainId: null,
  block: null,
  rpcUrl: null,
  attempts: [],
  results: [],
  active: 0,
  empty: 0,
  unknown: 0,
  checkedAt: null,
  loading: true,
});

const hexToBytes = (code: string): number =>
  code && code.startsWith('0x') ? Math.max(0, (code.length - 2) / 2) : 0;

/** One JSON-RPC round trip: chainId + blockNumber + a bytecode read per address. */
async function probe(url: string, addresses: string[]) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  const batch = [
    { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] },
    { jsonrpc: '2.0', id: 2, method: 'eth_blockNumber', params: [] },
    ...addresses.map((a, i) => ({
      jsonrpc: '2.0',
      id: 100 + i,
      method: 'eth_getCode',
      params: [a, 'latest'],
    })),
  ];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    const rows = Array.isArray(payload) ? payload : [payload];
    const byId = new Map<number, any>(rows.map((r: any) => [r.id, r]));

    const chainIdHex = byId.get(1)?.result;
    const blockHex = byId.get(2)?.result;
    if (typeof chainIdHex !== 'string') throw new Error('no eth_chainId in response');

    const results: CodeCheck[] = addresses.map((address, i) => {
      const row = byId.get(100 + i);
      if (!row || typeof row.result !== 'string') {
        return { address, status: 'unknown' as CodeStatus, bytes: 0, error: row?.error?.message ?? 'no result' };
      }
      const bytes = hexToBytes(row.result);
      return { address, status: (bytes > 0 ? 'active' : 'empty') as CodeStatus, bytes };
    });

    return {
      ok: true as const,
      ms: Math.round(performance.now() - started),
      chainId: Number.parseInt(chainIdHex, 16),
      block: typeof blockHex === 'string' ? Number.parseInt(blockHex, 16) : null,
      results,
    };
  } catch (e: any) {
    return {
      ok: false as const,
      ms: Math.round(performance.now() - started),
      reason: e?.name === 'AbortError' ? `timeout ${RPC_TIMEOUT_MS}ms` : String(e?.message ?? e),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function useOnChainCode(network: NetworkKey, addresses: string[]): ChainReport {
  const [report, setReport] = useState<ChainReport>(() => emptyReport(network));
  const key = `${network}:${addresses.join(',')}`;
  const lastKey = useRef<string>('');

  useEffect(() => {
    if (!addresses.length) return;
    if (lastKey.current === key) return;
    lastKey.current = key;

    let cancelled = false;
    setReport({ ...emptyReport(network), results: addresses.map((a) => ({ address: a, status: 'unknown', bytes: 0 })) });

    (async () => {
      const attempts: ChainReport['attempts'] = [];

      for (const url of RPC_ENDPOINTS[network]) {
        const out = await probe(url, addresses);
        attempts.push({ url, ok: out.ok, ms: out.ms, reason: out.ok ? undefined : out.reason });
        if (!out.ok) continue;

        if (cancelled) return;
        const active = out.results.filter((r) => r.status === 'active').length;
        const empty = out.results.filter((r) => r.status === 'empty').length;
        const unknown = out.results.filter((r) => r.status === 'unknown').length;
        setReport({
          network,
          expectedChainId: EXPECTED_CHAIN_ID[network],
          chainId: out.chainId,
          block: out.block,
          rpcUrl: url,
          attempts,
          results: out.results,
          active,
          empty,
          unknown,
          checkedAt: Date.now(),
          loading: false,
        });
        return;
      }

      if (cancelled) return;
      setReport({
        ...emptyReport(network),
        attempts,
        results: addresses.map((a) => ({ address: a, status: 'unknown' as CodeStatus, bytes: 0 })),
        unknown: addresses.length,
        loading: false,
        checkedAt: Date.now(),
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return report;
}