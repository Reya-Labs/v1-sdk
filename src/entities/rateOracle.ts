import { BigNumber, providers, utils } from 'ethers';
import mapProtocolIdToProtocol from '../utils/mapProtocolIdToProtocol';
import { BaseRateOracle__factory as baseRateOracleFactory } from '../typechain';
import { exponentialBackoff } from '../utils/retry';

export type RateOracleConstructorArgs = {
  id: string;
  protocolId: number;
};

export class RateOracle {
  public readonly id: string;

  public readonly protocol: string;

  public readonly protocolId: number;

  public constructor({ id, protocolId }: RateOracleConstructorArgs) {
    this.id = id;
    this.protocol = mapProtocolIdToProtocol(protocolId);
    this.protocolId = protocolId;
  }
}

export const getVariableFactor = (
  provider: providers.Provider,
  rateOracleId: string,
): ((
  fromInMS: number,
  toInMS: number,
) => Promise<{
  scaled: number;
  wad: BigNumber;
}>) => {
  const rateOracleContract = baseRateOracleFactory.connect(rateOracleId, provider);

  const func = async (
    fromInMS: number,
    toInMS: number,
  ): Promise<{
    scaled: number;
    wad: BigNumber;
  }> => {
    const fromWad = utils.parseUnits(fromInMS.toString(), 15);
    const toWad = utils.parseUnits(toInMS.toString(), 15);

    const variableFactorWad = await exponentialBackoff(() =>
      rateOracleContract.callStatic.variableFactor(fromWad, toWad),
    );

    const variableFactor = Number(utils.formatUnits(variableFactorWad, 18));

    return {
      scaled: variableFactor,
      wad: variableFactorWad,
    };
  };

  return func;
};
