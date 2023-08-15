import { V1V2PortfolioPosition } from '@voltz-protocol/api-sdk-v2';
import { getGLPPositionFinalBalance } from '../../glp';

export const adjustForGLPPositions = (positions: V1V2PortfolioPosition[]) => {
  const adjustedPositions: V1V2PortfolioPosition[] = positions.map(
    (position: V1V2PortfolioPosition): V1V2PortfolioPosition => {
      const isGLP =
        position.pool.marginEngineAddress.toLowerCase() ===
        '0xbe958ba49be73d3020cb62e512619da953a2bab1';

      if (isGLP) {
        const finalBalance: number = getGLPPositionFinalBalance({
          ownerAddress: position.ownerAddress,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
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
