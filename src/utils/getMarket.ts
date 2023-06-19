import { getSentryTracker } from '../init';

export type Market = {
  name: string;
  tags: {
    isBorrowing: boolean;
    isAaveV3: boolean;
    isV2: boolean;
    isYield: boolean;
  };
};

export const getMarket = (protocolId: number, isV2: boolean): Market => {
  switch (protocolId) {
    case 1:
      return {
        name: 'Aave',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
          isV2: isV2,
          isYield: true,
        },
      };

    case 2:
      return {
        name: 'Compound',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
          isV2: isV2,
          isYield: true,
        },
      };

    case 3:
      return {
        name: 'Lido',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
          isV2: isV2,
          isYield: true,
        },
      };

    case 4:
      return {
        name: 'Rocket',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
          isV2: isV2,
          isYield: true,
        },
      };

    case 5:
      return {
        name: 'Aave',
        tags: {
          isBorrowing: true,
          isAaveV3: false,
          isV2: isV2,
          isYield: false,
        },
      };

    case 6:
      return {
        name: 'Compound',
        tags: {
          isBorrowing: true,
          isAaveV3: false,
          isV2: isV2,
          isYield: false,
        },
      };

    case 7:
      return {
        name: 'Aave',
        tags: {
          isBorrowing: false,
          isAaveV3: true,
          isV2: isV2,
          isYield: true,
        },
      };

    case 8:
      return {
        name: 'GMX:GLP',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
          isV2: isV2,
          isYield: true,
        },
      };

    case 9:
      return {
        name: 'Aave',
        tags: {
          isBorrowing: true,
          isAaveV3: true,
          isV2: isV2,
          isYield: false,
        },
      };

    case 10:
      return {
        name: 'SOFR',
        tags: {
          isBorrowing: true,
          isAaveV3: false,
          isV2: isV2,
          isYield: false,
        },
      };

    default:
      break;
  }

  const errorMessage = `Unable to get market: protocol with id ${protocolId} unknown`;
  const error = new Error(errorMessage);

  const sentryTracker = getSentryTracker();
  sentryTracker.captureException(error);
  sentryTracker.captureMessage(errorMessage);

  throw error;
};
