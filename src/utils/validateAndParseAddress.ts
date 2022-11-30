import { getAddress } from '@ethersproject/address';
import * as Sentry from '@sentry/browser';

/**
 * Validates an address and returns the parsed (checksummed) version of that address
 * @param address the unchecksummed hex address
 */
export function validateAndParseAddress(address: string): string {
  try {
    return getAddress(address);
  } catch (error) {
    Sentry.captureException(error);
    Sentry.captureMessage(`${address} is not a valid address.`);
    throw new Error(`${address} is not a valid address.`);
  }
}
