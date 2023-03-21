import { ethers } from 'ethers';
import { getVoltzPoolConfig } from '../entities';
import { SupportedChainId } from '../types';
import { VoltzPausabilityWrapperABI } from '../ABIs';
import { getGasBuffer } from '../constants';

export const pauseContracts = async (
  signer: ethers.Signer,
  chainId: SupportedChainId,
): Promise<void> => {
  const config = getVoltzPoolConfig(chainId);
  if (config.voltzPausabilityWrapper.length === 0) {
    throw new Error('Pausability unsupported for this network.');
  }

  const vammIds = config.pools.map((p) => p.id);

  const wrapper = new ethers.Contract(
    config.voltzPausabilityWrapper,
    VoltzPausabilityWrapperABI,
    signer,
  );

  try {
    await wrapper.callStatic.pauseContracts(vammIds);
  } catch (error) {
    throw new Error('Unsuccessful contract pause.');
  }

  const gasLimit = await wrapper.estimateGas.pauseContracts(vammIds);

  const tx = await wrapper.pausaContracts(vammIds, {
    gasLimit: getGasBuffer(gasLimit),
  });

  await tx.await();
};

export const unpauseContracts = async (
  signer: ethers.Signer,
  chainId: SupportedChainId,
): Promise<void> => {
  const config = getVoltzPoolConfig(chainId);
  if (config.voltzPausabilityWrapper.length === 0) {
    throw new Error('Pausability unsupported for this network.');
  }

  const vammIds = config.pools.map((p) => p.id);

  const wrapper = new ethers.Contract(
    config.voltzPausabilityWrapper,
    VoltzPausabilityWrapperABI,
    signer,
  );

  try {
    await wrapper.callStatic.unpauseContracts(vammIds);
  } catch (error) {
    throw new Error('Unsuccessful contract unpause.');
  }

  const gasLimit = await wrapper.estimateGas.unpauseContracts(vammIds);

  const tx = await wrapper.pausaContracts(vammIds, {
    gasLimit: getGasBuffer(gasLimit),
  });

  await tx.await();
};
