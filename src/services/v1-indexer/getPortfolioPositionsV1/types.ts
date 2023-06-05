export type PortfolioPositionAMM = {
  id: string;
  chainId: number;

  isBorrowing: boolean;
  market: 'Aave V2' | 'Aave V3' | 'Compound' | 'Lido' | 'Rocket' | 'GMX:GLP' | 'SOFR';

  rateOracle: {
    protocolId: number;
  };

  underlyingToken: {
    name: 'eth' | 'usdc' | 'usdt' | 'dai';
  };

  termEndTimestampInMS: number;
  termStartTimestampInMS: number;
};

export type PortfolioPosition = {
  id: string;
  type: 'LP' | 'Variable' | 'Fixed';
  creationTimestampInMS: number;

  ownerAddress: string;

  tickLower: number;
  tickUpper: number;

  fixLow: number;
  fixHigh: number;

  tokenPriceUSD: number;
  notionalProvided: number;
  notionalTraded: number;
  notional: number;
  margin: number;

  status: {
    health: 'healthy' | 'danger' | 'warning';
    variant: 'matured' | 'settled' | 'active';
    currentFixed: number;
    receiving: number;
    paying: number;
  };

  unrealizedPNL: number;
  realizedPNLFees: number;
  realizedPNLCashflow: number;
  realizedPNLTotal: number;

  amm: PortfolioPositionAMM;
};
