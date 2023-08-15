import { V1V2PortfolioPositionDetails } from '@voltz-protocol/api-sdk-v2';
import { getGLPPositionFinalBalance } from '../../glp';

export const adjustForGlpPosition = (
  position: V1V2PortfolioPositionDetails,
): V1V2PortfolioPositionDetails => {
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
    };
  } else {
    return position;
  }
};
