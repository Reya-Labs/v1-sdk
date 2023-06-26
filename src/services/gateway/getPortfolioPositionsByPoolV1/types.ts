export type V1Pool = {
  id: string;
  chainId: number;

  vamm: string; // v1-only
  marginEngineAddress: string; // v1-only

  tickSpacing: number;
  termStartTimestampInMS: number;
  termEndTimestampInMS: number;

  isBorrowing: boolean;
  market: 'Aave V2' | 'Aave V3' | 'Compound' | 'Lido' | 'Rocket' | 'GMX:GLP' | 'SOFR';

  rateOracle: {
    address: string;
    protocolId: number;
  };

  underlyingToken: {
    address: string;
    name: 'eth' | 'usdc' | 'usdt' | 'dai';
    tokenDecimals: number;
    priceUSD: number;
  };

  // Indicates if Voltz protocol V2 is used for the pool
  isV2: boolean;
};

export type V1PortfolioPosition = {
  id: string;

  type: 'LP' | 'Variable' | 'Fixed';
  variant: 'matured' | 'settled' | 'active';
  creationTimestampInMS: number;

  ownerAddress: string;

  tickLower: number;
  tickUpper: number;

  fixLow: number;
  fixHigh: number;

  notionalProvided: number;
  notionalTraded: number;
  notional: number;
  margin: number;

  unrealizedPNL: number;
  realizedPNLFees: number;
  realizedPNLCashflow: number;
  realizedPNLTotal: number;

  health: 'healthy' | 'danger' | 'warning';
  receiving: number;
  paying: number;

  poolCurrentFixedRate: number;
  pool: V1Pool;
};

export type V1HistoryTransaction = {
  type: 'swap' | 'mint' | 'burn' | 'margin-update' | 'liquidation' | 'settlement' | 'maturity';
  creationTimestampInMS: number;
  notional: number;
  paidFees: number;
  fixedRate: number;
  marginDelta: number;
};

export type V1PortfolioPositionDetails = V1PortfolioPosition & {
  canEdit: boolean;
  canSettle: boolean;
  rolloverPoolId: null | string;

  history: V1HistoryTransaction[];
};
