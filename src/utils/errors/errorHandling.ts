/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */

import { BigNumber, ethers, utils } from 'ethers';

import { abi as FactoryABI } from '../../ABIs/Factory.json';
import * as errorJson from './errorMapping.json';

export const iface = new ethers.utils.Interface(FactoryABI);

export const extractErrorSignature = (message: string): string => {
  for (const errSig of Object.keys(errorJson)) {
    if (message.includes(errSig)) {
      return errSig;
    }
  }
  throw new Error('Unknown error signature');
};

export const getErrorReason = (error: any): string => {
  if (typeof error.error.data === 'string') {
    return error.error.data;
  }

  if (typeof error.error.error.data.data === 'string') {
    return error.error.error.data.data;
  }

  if (typeof error.error.data.originalError.data === 'string') {
    return error.error.data.originalError.data;
  }

  console.error(`Unknown error type. ${error}`);
  throw new Error('Unknown error type');
};

export const getErrorSignature = (error: any): string => {
  try {
    const reason = getErrorReason(error);

    if (reason.startsWith('0x08c379a0')) {
      return 'Error';
    }

    const decodedError = iface.parseError(reason);
    const errSig = decodedError.signature.split('(')[0];
    return errSig;
  } catch {
    console.error(`Failing to get error signature. ${error}`);
    throw new Error('Unknown error type');
  }
};

export const getReadableErrorMessage = (error: any): string => {
  const errSig = getErrorSignature(error);

  if (errSig === 'Error') {
    const reason = getErrorReason(error);

    try {
      const rawErrorMessage = utils.defaultAbiCoder.decode(['string'], reason)[0];

      if (rawErrorMessage in Object.keys(errorJson)) {
        return errorJson[rawErrorMessage as keyof typeof errorJson];
      }

      return `Unrecognised error. ${rawErrorMessage}`;
    } catch (_) {
      return 'Unknown error';
    }
  }

  if (errSig in Object.keys(errorJson)) {
    return errorJson[errSig as keyof typeof errorJson];
  }

  return 'Unknown error';
};

export type RawMintInfo = {
  marginRequirement: BigNumber;
};
