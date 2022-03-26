export const extractErrorMessage = (error: any): string | null => {
  if (!error) {
    return null;
  }

  if (!error.message && !error.data.message) {
    return null;
  }

  if (error.data.message) {
    return error.data.message.toString();
  }

  if (error.message) {
    return error.message.toString();
  }

  return null;
};

export const getError = (message: string): string => {
  if (message.includes('LOK')) {
    return 'The pool has not been initialized yet';
  }

  if (message.includes('closeToOrBeyondMaturity')) {
    return 'The pool is close to or beyond maturity';
  }

  if (message.includes('TLU')) {
    return 'Lower Fixed Rate must be smaller than Upper Fixed Rate!';
  }

  if (message.includes('TLM')) {
    return 'Lower Fixed Rate is too low!';
  }

  if (message.includes('TUM')) {
    return 'Upper Fixed Rate is too high!';
  }

  if (message.includes('only sender or approved integration')) {
    return 'No approval to act on this address behalf';
  }

  if (message.includes('MS or ME')) {
    return 'No approval to act on this address behalf';
  }

  if (message.includes('only msg.sender or approved can mint')) {
    return 'No approval to act on this address behalf';
  }

  if (message.includes('E<=S')) {
    return 'Internal error: The timestamps of the pool are not correct';
  }

  if (message.includes('B.T<S')) {
    return 'Internal error: Operations need current timestamp to be before maturity';
  }

  if (message.includes('endTime must be >= currentTime')) {
    return 'Internal error: Operations need current timestamp to be before maturity';
  }

  if (message.includes('parameters not set')) {
    return 'Internal error: Margin Calculator parameters not set';
  }

   if (message.includes('SPL')) {
    return 'No notional available in that direction';
  }

  if (message.includes('MarginRequirementNotMet')) {
    return 'No enough margin for this operation';
  }

  if (message.includes('NP')) {
    return 'Active positions should have positive liquidity';
  }

  if (message.includes('LO')) {
    return 'Internal Error: Liquidity exceeds maximum amount per tick';
  }

  if (message.includes('not enough liquidity to burn')) {
    return 'Not enough liquidity to burn';
  }

  if (message.includes('PositionNotSettled')) {
    return 'The position needs to be settled first';
  }

  if (message.includes('WithdrawalExceedsCurrentMargin')) {
    return 'No enough margin to withdraw';
  }

  if (message.includes('MarginLessThanMinimum')) {
    return 'No enough margin for this operation';
  }

  if (message.includes('InvalidMarginDelta')) {
    return 'Amount of notional must be greater than 0!';
  }

  if (message.includes('LiquidityDeltaMustBePositiveInMint')) {
    return 'Internal error: Liquidity for mint should be positive';
  }

  if (message.includes('LiquidityDeltaMustBePositiveInBurn')) {
    return 'Internal error: Liquidity for burn should be positive';
  }

  if (message.includes('IRSNotionalAmountSpecifiedMustBeNonZero')) {
    return 'Amount of notional must be greater than 0!';
  }

  return 'Unrecognized error';
};
