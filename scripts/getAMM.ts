import { ethers, providers, Signer } from 'ethers';
import { BaseRateOracleABI, MarginEngineABI, VammABI } from '../src/ABIs';
import AMM from '../src/entities/AMM/amm';

// utility for testing and integrations
// spawns up fully initialized AMM by vamm address
export const getAMM = async (
  vammAddress: string,
  provider: providers.Provider,
  signer: Signer,
): Promise<AMM> => {
  const vammContract = new ethers.Contract(vammAddress, VammABI, provider);

  const marginEngineAddress = await vammContract.marginEngine();
  const tick = (await vammContract.vammVars())[1];
  const tickSpacing = await vammContract.tickSpacing();

  const marginEngineContract = new ethers.Contract(marginEngineAddress, MarginEngineABI, provider);

  const factoryAddress = await marginEngineContract.factory();

  const rateOracleAddress = await marginEngineContract.rateOracle();

  const underlyingTokenAddress = await marginEngineContract.underlyingToken();

  const termStartTimestamp = await marginEngineContract.termStartTimestampWad();

  const termEndTimestamp = await marginEngineContract.termEndTimestampWad();

  const rateOracleContract = new ethers.Contract(rateOracleAddress, BaseRateOracleABI, provider);

  const rateOracleID = await rateOracleContract.UNDERLYING_YIELD_BEARING_PROTOCOL_ID();

  const amm = new AMM({
    id: vammAddress,
    provider,

    factoryAddress,
    vammAddress,
    marginEngineAddress,
    rateOracleAddress,
    underlyingTokenAddress,

    termStartTimestamp,
    termEndTimestamp,

    rateOracleID,

    tick,
    tickSpacing,
  });

  await amm.ammInit();
  await amm.userInit(signer);

  return amm;
};
