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

export const getSwapError = (message: string): string => {
  if (message.includes('closeToOrBeyondMaturity')) {
    return 'The pool is close to or beyond maturity';
  }

  if (message.includes('LOK')) {
    return 'The pool has not been initialized yet';
  }

  if (message.includes('SPL')) {
    return 'No notional available in that direction';
  }

  if (message.includes('only sender or approved integration')) {
    return 'No approval to act on this address behalf';
  }

  if (message.includes('E<=S')) {
    return 'Internal error: The timestamps of the pool are not correct';
  }

  if (message.includes('B.T<S')) {
    return 'Internal error: Operations need current timestamp to be before maturity';
  }

  if (message.includes('MarginRequirementNotMet')) {
    return 'Margin Requirement Not Met';
  }

  return 'Unrecognized error';
};
