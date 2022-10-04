/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */

import { BigNumber, ethers, utils } from 'ethers';
import * as factory from './Factory.json';
import * as errorJson from './errorMapping.json';

export const iface = new ethers.utils.Interface(factory.abi);

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

  if (typeof error.error.data.originalError.data === 'string') {
    return error.error.data.originalError.data;
  }

  console.error(`Unknown error type. Raw error: ${error}`);
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
    console.error(`Failing to get error signature. Raw error: ${error}`);
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

      return `Unrecognised error (Raw error: ${rawErrorMessage})`;
    } catch (_) {
      return 'Unknown error';
    }
  }

  if (errSig in Object.keys(errorJson)) {
    return errorJson[errSig as keyof typeof errorJson];
  }

  return 'Unknown error';
};

export type RawInfoPostMint = {
  marginRequirement: BigNumber;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const decodeInfoPostMint = (error: any, environment: string): RawInfoPostMint => {
  const errSig = getErrorSignature(error, environment);
  if (errSig === 'MarginLessThanMinimum') {
    switch (environment) {
      case 'LOCALHOST_SDK': {
        try {
          const message = error.message as string;
          const args: string[] = message
            .split(errSig)[1]
            .split('(')[1]
            .split(')')[0]
            .replaceAll(' ', '')
            .split(',');

          const result = { marginRequirement: BigNumber.from(args[0]) };
          return result;
        } catch {
          console.log(error);
          throw new Error('Unrecognised error type');
        }
      }
      case 'LOCALHOST_UI': {
        try {
          const reason = error.data.data.data.toString();
          const decodingResult = iface.decodeErrorResult(errSig, reason);
          const result = {
            marginRequirement: decodingResult.marginRequirement,
          };
          return result;
        } catch {
          console.log(error);
          throw new Error('Unrecognised error type');
        }
      }
      case 'KOVAN': {
        try {
          const reason = error.data.toString().replace('Reverted ', '');
          const decodingResult = iface.decodeErrorResult(errSig, reason);
          const result = {
            marginRequirement: decodingResult.marginRequirement,
          };
          return result;
        } catch {
          console.log(error);
          throw new Error('Unrecognised error type');
        }
      }
      case 'MAINNET': {
        try {
          // const stringifiedError = error.toString();
          // const afterOriginalError = stringifiedError.split("originalError")[1];
          // const afterData = afterOriginalError.split("data")[1];
          // const beforeMessage = afterData.split("message")[0];
          // const reason = beforeMessage.substring(3, beforeMessage.length - 3);
          let reason: string;

          if (typeof error.error.data === 'string') {
            reason = error.error.data;
          } else if (typeof error.error.data.originalError.data === 'string') {
            reason = error.error.data.originalError.data;
          } else {
            throw new Error('Unrecognised error type');
          }

          const decodingResult = iface.decodeErrorResult(errSig, reason);
          const result = {
            marginRequirement: decodingResult.marginRequirement,
          };
          return result;
        } catch {
          console.log(error);
          throw new Error('Unrecognised error type');
        }
      }
      default: {
        throw new Error('Unrecognised network for decoding errors');
      }
    }
  }
  throw new Error(getReadableErrorMessage(error, environment));
};
