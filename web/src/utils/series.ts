import { keccak256, encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem';
import { Speed, OptionSide } from '../types';

export interface ListedSeriesInfo {
  id: `0x${string}`;
  stock: string;
  isCall: boolean;
  speed: Speed;
  strike: number;
  tauSeconds: number;
}

export function computeSeriesId(
  stockAddress: `0x${string}`,
  isCall: boolean,
  strikeNum: number,
  speed: Speed,
  epoch: number = 0
): `0x${string}` {
  const strikeWad = parseUnits(strikeNum.toString(), 18);
  const tauSeconds = speed === 'DAILY' ? 86400 : 604800;

  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('address, bool, uint128, uint32, uint32'),
      [stockAddress, isCall, strikeWad, tauSeconds, epoch]
    )
  );
}

/**
 * Returns available listed strikes for an asset and side
 */
export function getListedStrikes(symbol: string, side: OptionSide, speed: Speed): number[] {
  if (symbol === 'NVDA') {
    if (side === 'UP' && speed === 'DAILY') {
      return [138, 141, 144, 147, 150];
    }
    if (side === 'DOWN' && speed === 'WEEKLY') {
      return [140];
    }
  }
  if (symbol === 'TSLA') {
    if (side === 'UP' && speed === 'DAILY') {
      return [240];
    }
    if (side === 'DOWN' && speed === 'WEEKLY') {
      return [235];
    }
  }
  if (symbol === 'SPY' && side === 'DOWN' && speed === 'WEEKLY') {
    return [570];
  }
  if (symbol === 'QQQ' && side === 'DOWN' && speed === 'WEEKLY') {
    return [485];
  }
  if (symbol === 'AAPL' && side === 'DOWN' && speed === 'WEEKLY') {
    return [220];
  }
  // Default fallback grid around base strike
  return [138, 141, 144, 147, 150];
}
