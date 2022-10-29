import { ethers, providers, Signer } from 'ethers';
import * as dotenv from 'dotenv';
import { BaseRateOracleABI, MarginEngineABI, VammABI } from '../../src/ABIs';
import { AMM } from '../../src/entities/AMM/amm';

dotenv.config();

export const getAMM = async ({
  vammAddress,
  provider,
  signer,
}: {
  vammAddress: string;
  provider: providers.Provider;
  signer?: Signer | string;
}): Promise<AMM> => {
  const vammContract = new ethers.Contract(vammAddress, VammABI, provider);

  const marginEngineAddress = await vammContract.marginEngine();
  const tick = (await vammContract.vammVars())[1];
  const tickSpacing = await vammContract.tickSpacing();

  const marginEngineContract = new ethers.Contract(marginEngineAddress, MarginEngineABI, provider);

  const factoryAddress = await marginEngineContract.factory();

  const rateOracleAddress = await marginEngineContract.rateOracle();

  const underlyingTokenAddress = await marginEngineContract.underlyingToken();

  const termStartTimestampWad = await marginEngineContract.termStartTimestampWad();

  const termEndTimestampWad = await marginEngineContract.termEndTimestampWad();

  const rateOracleContract = new ethers.Contract(rateOracleAddress, BaseRateOracleABI, provider);

  const rateOracleID = await rateOracleContract.UNDERLYING_YIELD_BEARING_PROTOCOL_ID();

  const amm = new AMM({
    id: vammAddress,
    provider,
    coingeckoApiKey: process.env.REACT_APP_COINGECKO_API_KEY || '',

    factoryAddress,
    marginEngineAddress,
    rateOracleAddress,
    underlyingTokenAddress,

    termStartTimestampWad,
    termEndTimestampWad,

    rateOracleID,

    tick,
    tickSpacing,
  });

  await amm.init(signer);

  return amm;
};
