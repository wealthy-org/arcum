// Testnet (46630) contract addresses — inlined from deployments/46630.json
// to avoid cross-directory import issues in Vercel builds.
// Source: deployments/46630.json @ deployBlock 152722071

export const SHARE_DECIMALS = 12; // WriterPool.decimals() di 46630
export const WAD_DECIMALS = 18;   // nav, navPerShare, totalLiability, vMark, strike
export const USDG_DECIMALS = 6;

export const C = {
  usdg:           '0x0953ac821a5f07A39b02Ecf5faaEca0477f13986' as `0x${string}`,
  engine:         '0x98F7B4Ae9615a655c4321b1326D588e35303280C' as `0x${string}`,
  writerPool:     '0x1F79F6D8eFB739c270Ec7957Fff0754151eF550F' as `0x${string}`,
  agentRouter:    '0xAB3379ca486c7365C693FB6263B021759F45ffaa' as `0x${string}`,
  seriesRegistry: '0x9c0B29e8faD8854DdFD6Ff1bB823E75788dEa82B' as `0x${string}`,
  priceGuard:     '0x3D541ad6c67b2B4CAFa1ecBC5E3aC877022c3dBe' as `0x${string}`,
  deployBlock:    BigInt(152722071),
} as const;
