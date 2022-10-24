import { BigNumber } from 'ethers';
import { Mint, Burn, Swap, MarginUpdate, Liquidation, Settlement } from '../actions';
import AMM from '../AMM/amm';

export type PositionConstructorArgs = {
  id: string;
  amm: AMM;
  timestamp: number;

  owner: string;
  tickLower: number;
  tickUpper: number;
  positionType: number;

  liquidity: BigNumber;
  accumulatedFees: BigNumber;

  fixedTokenBalance: BigNumber;
  variableTokenBalance: BigNumber;
  margin: BigNumber;

  isSettled: boolean;

  mints: Array<Mint>;
  burns: Array<Burn>;
  swaps: Array<Swap>;
  marginUpdates: Array<MarginUpdate>;
  liquidations: Array<Liquidation>;
  settlements: Array<Settlement>;
};
