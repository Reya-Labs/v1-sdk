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

  ownerAddress: string;

  tickLower: number;
  tickUpper: number;

  fixLow: number;
  fixHigh: number;

  notionalProvided: number;
  notionalProvidedUSD: number;

  notionalTraded: number;
  notionalTradedUSD: number;

  notional: number;
  notionalUSD: number;

  margin: number;
  marginUSD: number;

  status: {
    health: 'healthy' | 'danger' | 'warning';
    variant: 'matured' | 'settled' | 'active';
    currentFixed: number;
    receiving: number;
    paying: number;
  };

  unrealizedPNLUSD: number;
  unrealizedPNL: number;

  realizedPNLFees: number;
  realizedPNLFeesUSD: number;

  realizedPNLCashflow: number;
  realizedPNLCashflowUSD: number;

  realizedPNLTotal: number;
  realizedPNLTotalUSD: number;

  amm: PortfolioPositionAMM;
};

export type PortfolioSummary = {
  portfolioValueUSD: number;
  marginUSD: number;
  unrealizedPNLUSD: number;
  realizedPNLUSD: number;
  notionalUSD: number;

  numberOfPositions: number;
  healthyPositions: number;
  warningPositions: number;
  dangerPositions: number;
};

export type GetPortfolioPositionsResponse = {
  positions: PortfolioPosition[];
  summary: PortfolioSummary;
};
