import { BigNumber } from 'ethers';

export const MaxUint256Bn = BigNumber.from(
  '115792089237316195423570985008687907853269984665640564039457584007913129639935',
);

export const TresholdApprovalBn = BigNumber.from(
  '6277101735386680763835789423207666416102355444464034512896',
);

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

/**
 * The minimum tick that can be used on any pool.
 */
export const MIN_TICK = -69100;
/**
 * The maximum tick that can be used on any pool.
 */
export const MAX_TICK = 69100;

/**
 * The minimum tick that can be used on any pool.
 */
export const MIN_FIXED_RATE = 0.001;
/**
 * The maximum tick that can be used on any pool.
 */
export const MAX_FIXED_RATE = 1001;

export const ONE_YEAR_IN_SECONDS = 31536000;
