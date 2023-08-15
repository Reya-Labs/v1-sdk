import { V1V2PortfolioPosition } from '@voltz-protocol/api-sdk-v2';
import { getAavePositionFinalBalance } from '../../aave';

export const adjustForAavePositions = (positions: V1V2PortfolioPosition[]) => {
  const adjustedPositions: V1V2PortfolioPosition[] = positions.map(
    (position: V1V2PortfolioPosition): V1V2PortfolioPosition => {
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
          variant:
            finalBalance === 0
              ? 'settled'
              : position.variant === 'active'
              ? 'matured'
              : position.variant,
        };
      } else {
        return position;
      }
    },
  );

  return adjustedPositions;
};
