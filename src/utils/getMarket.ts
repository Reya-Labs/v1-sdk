import { getSentryTracker } from '../init';

export type Market = {
  name: string;
  tags: {
    isBorrowing: boolean;
    isAaveV3: boolean;
  };
};

export const getMarket = (protocolId: number): Market => {
  switch (protocolId) {
    case 1:
      return {
        name: 'Aave',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
        },
      };

    case 2:
      return {
        name: 'Compound',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
        },
      };

    case 3:
      return {
        name: 'Lido',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
        },
      };

    case 4:
      return {
        name: 'Rocket',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
        },
      };

    case 5:
      return {
        name: 'Aave',
        tags: {
          isBorrowing: true,
          isAaveV3: false,
        },
      };

    case 6:
      return {
        name: 'Compound',
        tags: {
          isBorrowing: true,
          isAaveV3: false,
        },
      };

    case 7:
      return {
        name: 'Aave',
        tags: {
          isBorrowing: false,
          isAaveV3: true,
        },
      };

    case 8:
      return {
        name: 'GMX:GLP',
        tags: {
          isBorrowing: false,
          isAaveV3: false,
        },
      };

    case 9:
      return {
        name: 'Aave',
        tags: {
          isBorrowing: true,
          isAaveV3: true,
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
