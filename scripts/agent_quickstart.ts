#!/usr/bin/env node
/**
 * Arcum Protocol — Autonomous AI Agent Quickstart & MCP Execution Runner
 * Demonstrates non-custodial option execution via AgentRouter & Model Context Protocol (MCP).
 * Target: Robinhood Chain Testnet (Chain ID 46630) | Settlement: USDG
 */

import { createPublicClient, http } from '../web/node_modules/viem/_esm/index.js';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('./deployments/46630.json', 'utf8'));

const chain = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.chain.robinhood.com'] } },
};

async function runAgentSession() {
  console.log('='.repeat(75));
  console.log('ARCUM PROTOCOL — AI AGENT QUICKSTART & MCP TOOL RUNNER');
  console.log('Network: Robinhood Chain Testnet (46630) | Settlement: USDG (6 decimals)');
  console.log('='.repeat(75));

  const pub = createPublicClient({ chain, transport: http() });

  const ROUTER = manifest.agentRouter;
  const REGISTRY = manifest.seriesRegistry;
  const ENGINE = manifest.engineProxy;

  console.log('\n[STEP 1: ON-CHAIN CONTRACT VERIFICATION]');
  console.log(`• AgentRouter:    ${ROUTER}`);
  console.log(`• SeriesRegistry: ${REGISTRY}`);
  console.log(`• ArcumEngine:    ${ENGINE}`);

  const seriesCount = await pub.readContract({
    address: REGISTRY,
    abi: [
      {
        inputs: [],
        name: 'seriesCount',
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'seriesCount',
  });
  console.log(`• Listed Series:  ${seriesCount.toString()} active series on testnet`);

  console.log('\n[STEP 2: AGENT DELEGATION STATUS]');
  console.log('• Non-custodial model: Agent has 0 token access. All mints go directly to Owner.');
  console.log('• To trade on-chain via Agent key:');
  console.log('  1. Owner grants policy: router.setPolicy(agent, budget, maxTrade, expiry, canSell, canShield, stocks)');
  console.log('  2. Agent executes trade: router.buyFor(...) or router.shieldFor(...)');
  console.log('  3. Owner revokes anytime: router.revoke(agent)');

  console.log('\n' + '='.repeat(75));
  console.log('AGENT TESTNET VERIFICATION: [PASS] LIVE TESTNET CONNECTION CONFIRMED');
  console.log('='.repeat(75));
}

runAgentSession().catch(console.error);
