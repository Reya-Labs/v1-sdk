/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumber, providers, Signer } from 'ethers';
import { isUndefined } from 'lodash';
import AMM from './entities/AMM/amm';
import { BorrowAMM } from '../src/entities/BorrowAMM/borrowAMM';
import { Position } from '../src/entities/Position/position';
import { getAMM } from './getAMM';
import { mintMap, burnMap, swapMap, marginUpdateMap, liquidationMap, settlementMap } from './utils';
import { getGraphPositions } from '../graph-queries/queries';

type EcosystemInput = {
  whitelistedAMMs: string[];
  provider: providers.Provider;
  signer: Signer | string;
};

type Ecosystem = {
  amms: AMM[];
  positions: Position[];
  borrowAMMs: BorrowAMM[];
};

const findAMM = (amms: AMM[], positionId: string): AMM | undefined => {
  return amms.find((amm) => positionId.startsWith(amm.marginEngineAddress.toLowerCase()));
};

const findPosition = (positions: Position[], positionId: string): Position | undefined => {
  return positions.find((position) => positionId === position.id);
};

export const getEcosystem = async ({
  whitelistedAMMs,
  provider,
  signer,
}: EcosystemInput): Promise<Ecosystem> => {
  const ammsResponse = await Promise.allSettled(
    whitelistedAMMs.map((vammAddress) =>
      getAMM({
        vammAddress,
        provider,
        signer,
      }),
    ),
  );
  const amms = ammsResponse.reduce((bag: AMM[], resp) => {
    if (resp.status === 'fulfilled') {
      bag.push(resp.value);
    }
    return bag;
  }, []);

  const userAddress = typeof signer === 'string' ? signer : await signer.getAddress();
  const data = await getGraphPositions(`where: {owner: "${userAddress.toLowerCase()}"}`);

  const positionResponse = await Promise.allSettled(
    data.positions.map(async (info: any): Promise<Position | void> => {
      const positionId = info.id;
      const amm = findAMM(amms, positionId);

      if (isUndefined(amm)) {
        return;
      }

      const tickLower = parseInt(info.tickLower, 10);
      const tickUpper = parseInt(info.tickUpper, 10);

      const position = new Position({
        id: info.id,
        amm,
        timestamp: parseInt(info.createdTimestamp, 10),

        owner: userAddress,
        tickLower,
        tickUpper,
        positionType: parseInt(info.positionType, 10),

        liquidity: BigNumber.from(info.liquidity),
        accumulatedFees: BigNumber.from(info.accumulatedFees),

        fixedTokenBalance: BigNumber.from(info.fixedTokenBalance),
        variableTokenBalance: BigNumber.from(info.variableTokenBalance),
        margin: BigNumber.from(info.margin),

        isSettled: info.isSettled,

        mints: info.mints.map((item: any) =>
          mintMap({ item, amm, positionId, tickLower, tickUpper }),
        ),
        burns: info.burns.map((item: any) =>
          burnMap({ item, amm, positionId, tickLower, tickUpper }),
        ),
        swaps: info.swaps.map((item: any) => swapMap({ item, amm, positionId })),
        marginUpdates: info.marginUpdates.map((item: any) =>
          marginUpdateMap({ item, amm, positionId }),
        ),
        liquidations: info.liquidations.map((item: any) =>
          liquidationMap({ item, amm, positionId }),
        ),
        settlements: info.settlements.map((item: any) => settlementMap({ item, amm, positionId })),
      });

      await position.init();
      return position;
    }),
  );

  const positions = positionResponse.reduce((bag: Position[], item) => {
    if (item.status === 'fulfilled') {
      if (!isUndefined(item.value)) {
        bag.push(item.value);
      }
    }
    return bag;
  }, []);

  const borrowAMMsResponse = await Promise.allSettled(
    amms
      .filter((amm) => (amm.rateOracleID === 5 || amm.rateOracleID === 6) && !amm.matured)
      .map(async (amm): Promise<BorrowAMM> => {
        const borrowAMM = new BorrowAMM({
          id: amm.id,
          amm,
        });
        await borrowAMM.init(
          findPosition(
            positions,
            `${amm.marginEngineAddress.toLowerCase()}#${userAddress.toLowerCase()}#${-69000}#${69060}`,
          ),
        );
        return borrowAMM;
      }),
  );

  const borrowAMMs = borrowAMMsResponse.reduce((bag: BorrowAMM[], item) => {
    if (item.status === 'fulfilled') {
      if (!isUndefined(item.value)) {
        bag.push(item.value);
      }
    }
    return bag;
  }, []);

  return {
    amms,
    positions,
    borrowAMMs,
  };
};
