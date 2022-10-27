import { providers, Signer } from 'ethers';
import { isUndefined } from 'lodash';
import { BorrowAMM } from '../../src/entities/BorrowAMM/borrowAMM';
import { getPosition } from './getPosition';

export const getBorrowAMM = async ({
  vammAddress,
  marginEngineAddress,
  provider,
  signer,
}: {
  vammAddress: string;
  marginEngineAddress: string;
  provider: providers.Provider;
  signer: Signer | string;
}): Promise<BorrowAMM | undefined> => {
  const position = await getPosition({
    provider,
    vammAddress,
    marginEngineAddress,
    signer,
    tickLower: -69000,
    tickUpper: 69060,
  });

  if (isUndefined(position)) {
    return;
  }

  const borrowAMM = new BorrowAMM({ id: position.amm.id, amm: position.amm });

  await borrowAMM.init(position);

  return borrowAMM;
};
