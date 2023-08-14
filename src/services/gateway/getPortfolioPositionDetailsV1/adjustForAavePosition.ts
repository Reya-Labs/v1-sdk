import { V1V2PortfolioPositionDetails } from '@voltz-protocol/api-sdk-v2';
import { getAavePositionFinalBalance } from '../../aave';

export const adjustForAavePosition = (
  position: V1V2PortfolioPositionDetails,
): V1V2PortfolioPositionDetails => {
  const aaveVAMMs = [
    '0x037c8d42972c3c058224a2e51b5cb9b504f75b77',
    '0xd9a3f015a4ffd645014ec0f43148685be8754737',
    '0x3ecf01157e9b1a66197325771b63789d1fb18f1f',
  ];

  const isAave = aaveVAMMs.includes(position.pool.vamm.toLowerCase());

  if (isAave) {
    const finalBalance: number = getAavePositionFinalBalance({
      ownerAddress: position.ownerAddress,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      vammAddress: position.pool.vamm,
    });
    return {
      ...position,
      margin: finalBalance,
      maxWithdrawableMargin: finalBalance,
      unrealizedPNL: 0,
      realizedPNLFees: 0,
      realizedPNLCashflow: 0,
      realizedPNLTotal: 0,
      settlementCashflow: 0,
      variant: finalBalance === 0 ? 'settled' : 'matured',
      canSettle: true,
      canEdit: false,
    };
  } else {
    return position;
  }
};
