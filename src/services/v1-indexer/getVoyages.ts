//api.voltz.xyz/voyage/{chainId}/{walletAccount}

import axios from 'axios';
import { getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { getServiceUrl } from './urls';

export type Voyage = {
  id: 'v2Voyage';
  timestamp: number | null; // UNIX milliseconds
  status: 'achieved' | 'notAchieved' | 'notStarted' | 'inProgress';
};

export type GetVoyagesParams = {
  chainId: SupportedChainId;
  account: string;
};

export const getVoyages = async ({ chainId, account }: GetVoyagesParams): Promise<Voyage[]> => {
  try {
    const baseUrl = getServiceUrl('voyage');
    const url = `${baseUrl}/${chainId}/${account.toLowerCase()}`;

    const res = await axios.get<Voyage[]>(url, {
      withCredentials: false,
    });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud Pool API unavailable with message ${(e as Error).message}`,
    );
    return [];
  }
};
