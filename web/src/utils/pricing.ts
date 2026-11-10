/**
 * Arcum Frontend Pricing Utilities
 * Computes everlasting option prices, Greeks, holding cost decay curves, and scenario PnL.
 */

import { Speed } from '../types';

export const SECONDS_PER_YEAR = 31536000;

export function getTauSeconds(speed: Speed): number {
  return speed === 'DAILY' ? 86400 : 604800;
}

export function calculateAlpha(sigmaBps: number, tauSeconds: number): number {
  const sigma = sigmaBps / 10000;
  const tauYears = tauSeconds / SECONDS_PER_YEAR;
  const denom = (sigma * sigma) * tauYears;
  const term = 8 / denom;
  const disc = 1 + term;
  return (1 + Math.sqrt(disc)) / 2;
}

export function quoteOption(
  spot: number,
  strike: number,
  sigmaBps: number,
  speed: Speed,
  isCall: boolean,
  units: number
) {
  const tau = getTauSeconds(speed);
  const alpha = calculateAlpha(sigmaBps, tau);
  const denom = 2 * alpha - 1;

  let markPrice = 0;
  let payoff = 0;

  if (isCall) {
    payoff = Math.max(spot - strike, 0);
    if (spot <= strike) {
      markPrice = (strike / denom) * Math.pow(spot / strike, alpha);
    } else {
      markPrice = (spot - strike) + (strike / denom) * Math.pow(strike / spot, alpha - 1);
    }
  } else {
    payoff = Math.max(strike - spot, 0);
    if (spot >= strike) {
      markPrice = (strike / denom) * Math.pow(strike / spot, alpha - 1);
    } else {
      markPrice = (strike - spot) + (strike / denom) * Math.pow(spot / strike, alpha);
    }
  }

  // Delta
  let delta = 0;
  if (isCall) {
    if (spot <= strike) {
      delta = (alpha / denom) * Math.pow(spot / strike, alpha - 1);
    } else {
      delta = 1 - ((alpha - 1) / denom) * Math.pow(strike / spot, alpha);
    }
  } else {
    if (spot >= strike) {
      delta = -((alpha - 1) / denom) * Math.pow(strike / spot, alpha);
    } else {
      delta = (alpha / denom) * Math.pow(spot / strike, alpha - 1) - 1;
    }
  }

  // Gamma
  const numCoeff = (alpha * (alpha - 1)) / (denom * strike);
  const gamma = spot <= strike
    ? numCoeff * Math.pow(spot / strike, alpha - 2)
    : numCoeff * Math.pow(strike / spot, alpha + 1);

  const timeValue = Math.max(markPrice - payoff, 0);
  const dailyDecayUsdg = (timeValue / tau) * 86400 * units;

  // 3 bps base protocol trade fee
  const tradeFeeBps = 3;
  const spreadBps = speed === 'DAILY' ? 15 : 25;
  const rawCost = markPrice * units;
  const feeUsdg = (rawCost * tradeFeeBps) / 10000;
  const spreadCost = (rawCost * spreadBps) / 10000;
  const totalCostUsdg = rawCost + feeUsdg + spreadCost;

  const breakeven = isCall
    ? strike + (totalCostUsdg / units)
    : Math.max(strike - (totalCostUsdg / units), 0);

  return {
    spot,
    strike,
    speed,
    isCall,
    units,
    markPriceUsdg: markPrice,
    spreadBps,
    feeUsdg,
    totalCostUsdg,
    delta,
    gamma,
    dailyDecayUsdg,
    breakeven
  };
}

/**
 * Computes projected scenario PnL for What-If visualizer
 */
export function calculateScenarioPnL(
  spotTarget: number,
  strike: number,
  sigmaBps: number,
  speed: Speed,
  isCall: boolean,
  units: number,
  daysElapsed: number,
  entryCostUsdg: number
) {
  const quoteFuture = quoteOption(spotTarget, strike, sigmaBps, speed, isCall, 1);
  const tau = getTauSeconds(speed);
  const payoff = isCall ? Math.max(spotTarget - strike, 0) : Math.max(strike - spotTarget, 0);
  const timeValue = Math.max(quoteFuture.markPriceUsdg - payoff, 0);
  const ratePerSec = quoteFuture.markPriceUsdg > 0 ? timeValue / (quoteFuture.markPriceUsdg * tau) : 0;
  const decayFactor = Math.exp(-ratePerSec * (daysElapsed * 86400));
  const effectiveUnitsFuture = units * decayFactor;

  const grossValueUsdg = quoteFuture.markPriceUsdg * effectiveUnitsFuture;
  const feeExit = (grossValueUsdg * 3) / 10000;
  const netValueUsdg = Math.max(grossValueUsdg - feeExit, 0);

  const netPnlUsdg = netValueUsdg - entryCostUsdg;
  const roiPct = entryCostUsdg > 0 ? (netPnlUsdg / entryCostUsdg) * 100 : 0;

  return {
    spotTarget,
    daysElapsed,
    effectiveUnitsFuture,
    decayPct: ((1 - decayFactor) * 100).toFixed(1),
    netValueUsdg,
    netPnlUsdg,
    roiPct,
  };
}
