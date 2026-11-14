import manifest from '../../../deployments/46630.json';

export const C = {
  usdg: manifest.usdg as `0x${string}`,
  engine: manifest.engineProxy as `0x${string}`,
  writerPool: manifest.writerPoolProxy as `0x${string}`,
  agentRouter: manifest.agentRouter as `0x${string}`,
  seriesRegistry: manifest.seriesRegistry as `0x${string}`,
  priceGuard: manifest.priceGuard as `0x${string}`,
  deployBlock: BigInt(manifest.deployBlock ?? 0),
} as const;
