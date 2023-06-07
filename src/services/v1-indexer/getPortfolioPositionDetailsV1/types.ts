import { PortfolioPositionAMM } from '../getPortfolioPositionsV1';

export type HistoryTransaction = {
  type: 'swap' | 'mint' | 'burn' | 'margin-update' | 'liquidation' | 'settlement' | 'maturity';
  creationTimestampInMS: number;
  notional: number;
  paidFees: number;
  fixedRate: number;
  marginDelta: number;
};

export type PortfolioPositionDetails = {
  id: string;
  variant: 'matured' | 'settled' | 'active';
  type: 'LP' | 'Variable' | 'Fixed';
  creationTimestampInMS: number;

  tickLower: number;
  tickUpper: number;

  fixLow: number;
  fixHigh: number;

  tokenPriceUSD: number;
  notional: number;
  margin: number;

  canEdit: boolean;
  canSettle: boolean;
  rolloverAmmId: null | string;

  realizedPNLFees: number;
  realizedPNLCashflow: number;
  realizedPNLTotal: number;

  history: HistoryTransaction[];
  amm: PortfolioPositionAMM;
};
