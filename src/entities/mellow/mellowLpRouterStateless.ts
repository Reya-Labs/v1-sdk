import { BigNumber, ethers } from 'ethers';
import { isUndefined } from 'lodash';
import { getMellowConfig } from './config/config';
import { abi as MellowLensContractABI } from '../../ABIs/MellowLensContract.json';
import { closeOrPastMaturity } from './config/utils';
import { getTokenInfo } from '../../services/getTokenInfo';
import { descale, scale } from '../../utils/scaling';
import { sum } from '../../utils/functions';
import { getGasBuffer, MaxUint256Bn, TresholdApprovalBn } from '../../constants';
import { abi as IERC20MinimalABI } from '../../ABIs/IERC20Minimal.json';
import { abi as MellowMultiVaultRouterABI } from '../../ABIs/MellowMultiVaultRouterABI.json';
import { abi as Erc20RootVaultABI } from '../../ABIs/Erc20RootVault.json';
import { convertGasUnitsToUSD } from '../../utils/mellowHelpers/convertGasUnitsToUSD';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type ContractRouterInfo = {
  token: string;
  tokenBalance: BigNumber;
  ethBalance: BigNumber;
  isRegisteredForAutoRollover: boolean;
  erc20RootVaults: {
    rootVault: string;
    latestMaturity: BigNumber;
    vaultDeprecated: boolean;
    pendingUserDeposit: BigNumber;
    committedUserDeposit: BigNumber;
    canWithdrawOrRollover: boolean;
  }[];
};

type VaultInfo = {
  vaultId: string;

  pools: string[];
  estimatedHistoricApy: [number, number];
  defaultWeight: number;

  maturityTimestampMS: number;
  withdrawable: boolean;
  rolloverable: boolean;

  userVaultCommittedDeposit: number;
  userVaultPendingDeposit: number;
  userVaultDeposit: number;

  canUserManageVault: boolean;
};

type RouterInfo = {
  routerId: string;

  soon: boolean;
  title: string;
  description: string;
  underlyingPools: string[];
  tokenId: string;

  expired: boolean;
  depositable: boolean;

  userWalletBalance: number;

  userRouterDeposit: number;
  userRouterCommittedDeposit: number;
  userRouterPendingDeposit: number;
  isUserRegisteredForAutoRollover: boolean;

  vaults: VaultInfo[];
};

const mapRouter = (
  routerConfig: ReturnType<typeof getMellowConfig>['MELLOW_ROUTERS'][0],
  optimiserContractInfo: ContractRouterInfo,
): RouterInfo => {
  const tokenId = optimiserContractInfo.token;
  const { name: tokenName, decimals: tokenDecimals } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  const latestMaturity = Math.max(
    ...routerConfig.metadata.vaults.map((v) => v.maturityTimestampMS),
  );
  const expired = closeOrPastMaturity(latestMaturity);
  const depositable = !expired && !routerConfig.metadata.deprecated;

  const userWalletBalance = descale(
    isETH ? optimiserContractInfo.ethBalance : optimiserContractInfo.tokenBalance,
    tokenDecimals,
  );

  const underlyingPools = routerConfig.metadata.vaults.reduce((allPools, currentVault) => {
    if (currentVault.weight > 0) {
      const appendingPools = currentVault.pools.filter((p) => !allPools.includes(p));
      return [...allPools, ...appendingPools];
    }
    return allPools;
  }, [] as string[]);

  const vaultsContractInfo = optimiserContractInfo.erc20RootVaults;

  const vaults = routerConfig.metadata.vaults.map((vaultConfig, vaultIndex): VaultInfo => {
    const vaultContractInfo = vaultsContractInfo[vaultIndex];

    const userVaultCommittedDeposit = descale(
      vaultContractInfo.committedUserDeposit,
      tokenDecimals,
    );
    const userVaultPendingDeposit = descale(vaultContractInfo.pendingUserDeposit, tokenDecimals);
    const userVaultDeposit = userVaultCommittedDeposit + userVaultPendingDeposit;

    return {
      vaultId: vaultContractInfo.rootVault,

      pools: vaultConfig.pools,
      estimatedHistoricApy: vaultConfig.estimatedHistoricApy,
      defaultWeight: vaultConfig.weight,

      maturityTimestampMS: vaultContractInfo.latestMaturity.toNumber() * 1000,
      withdrawable: vaultConfig.withdrawable && vaultContractInfo.canWithdrawOrRollover,
      rolloverable: vaultConfig.withdrawable && vaultContractInfo.canWithdrawOrRollover,

      userVaultCommittedDeposit,
      userVaultPendingDeposit,
      userVaultDeposit,

      canUserManageVault: vaultContractInfo.canWithdrawOrRollover,
    };
  });

  return {
    routerId: routerConfig.router,

    soon: routerConfig.metadata.soon,
    title: routerConfig.metadata.title,
    description: routerConfig.metadata.description,

    underlyingPools,

    tokenId,

    expired,
    depositable,

    userWalletBalance,

    userRouterDeposit: sum(vaults.map((vault) => vault.userVaultDeposit)),
    userRouterCommittedDeposit: sum(vaults.map((vault) => vault.userVaultCommittedDeposit)),
    userRouterPendingDeposit: sum(vaults.map((vault) => vault.userVaultPendingDeposit)),
    isUserRegisteredForAutoRollover: optimiserContractInfo.isRegisteredForAutoRollover,

    vaults,
  };
};

export const getAllMellowRouters = async ({
  network,
  provider,
  userAddress = ZERO_ADDRESS,
}: {
  network: string;
  provider: ethers.providers.JsonRpcProvider;
  userAddress: string;
}): Promise<RouterInfo[]> => {
  const config = getMellowConfig(network);

  const mellowLensContract = new ethers.Contract(
    config.MELLOW_LENS,
    MellowLensContractABI,
    provider,
  );

  const optimisersContractInfo: ContractRouterInfo[] = await mellowLensContract.getOptimisersInfo(
    [config.MELLOW_ROUTERS.map((routerConfig) => routerConfig.router)],
    true,
    userAddress,
  );
  const routers = config.MELLOW_ROUTERS.map((routerConfig, index) =>
    mapRouter(routerConfig, optimisersContractInfo[index]),
  );

  return routers;
};

export const getMellowRouter = async ({
  network,
  provider,
  routerId,
  userAddress = ZERO_ADDRESS,
}: {
  network: string;
  provider: ethers.providers.JsonRpcProvider;
  routerId: string;
  userAddress: string;
}): Promise<RouterInfo> => {
  const config = getMellowConfig(network);

  const routerConfig = config.MELLOW_ROUTERS.find(
    (item) => item.router.toLowerCase() === routerId.toLowerCase(),
  );

  if (!routerConfig) {
    // TODO: add sentry
    throw new Error('Router ID not found');
  }

  const mellowLensContract = new ethers.Contract(
    config.MELLOW_LENS,
    MellowLensContractABI,
    provider,
  );

  const optimisersContractInfo: ContractRouterInfo[] = await mellowLensContract.getOptimisersInfo(
    [routerConfig.router],
    true,
    userAddress,
  );

  const router = mapRouter(routerConfig, optimisersContractInfo[0]);

  return router;
};

// Move to utilities
export const isTokenApproved = async ({
  tokenId,
  userAddress,
  to,
  provider,
  threshold,
  forceErc20,
}: {
  tokenId: string;
  userAddress: string;
  to: string;
  threshold?: number;
  provider: ethers.providers.JsonRpcProvider;
  forceErc20?: boolean;
}): Promise<boolean> => {
  // Get the token decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);

  // If the token is ETH and the flag that forces ERC20 (i.e. WETH) is not set,
  // then return true
  if (!forceErc20 && tokenName === 'ETH') {
    return true;
  }

  // Get the actual threshold
  const actualAmount = isUndefined(threshold)
    ? TresholdApprovalBn
    : scale(threshold, tokenDecimals);

  // Get the token contract
  const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, provider);

  // Query the allowance
  const tokenApproval = await tokenContract.allowance(userAddress, to);

  // Return if the allowance is above the threshold
  return tokenApproval.gte(actualAmount);
};

// Move to utilities
export const approveToken = async ({
  tokenId,
  to,
  amount,
  signer,
}: {
  tokenId: string;
  to: string;
  amount?: number;
  signer: ethers.Signer;
}): Promise<ethers.ContractReceipt> => {
  // Get the token decimals
  const { decimals: tokenDecimals } = getTokenInfo(tokenId);

  // Get the actual amount
  const actualAmount = isUndefined(amount) ? MaxUint256Bn : scale(amount, tokenDecimals);

  // Get the token contract
  const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);

  // Get the gas limit
  const gasLimit = await tokenContract.estimateGas.approve(to, actualAmount);

  // Send the approve transaction
  const tx = await tokenContract.approve(to, amount, {
    gasLimit: getGasBuffer(gasLimit),
  });

  // Wait for the transaction receipt
  const receipt = await tx.wait();

  // Return the receipt
  return receipt;
};

const validateWeights = (weights: number[]): boolean => {
  if (!weights.every((value) => Number.isInteger(value))) {
    // All values of default weights must be integer
    return false;
  }

  return sum(weights) === 100;
};

export const deposit = async ({
  routerId,
  routerVaultIds,
  tokenId,
  amount,
  weights,
  signer,
  network,
}: {
  routerId: string;
  routerVaultIds: string[];
  tokenId: string;
  amount: number;
  weights: [string, number][];
  signer: ethers.Signer;
  network: string;
}): Promise<ethers.ContractReceipt> => {
  const config = getMellowConfig(network);

  const routerConfig = config.MELLOW_ROUTERS.find(
    (item) => item.router.toLowerCase() === routerId.toLowerCase(),
  );

  if (!routerConfig) {
    // TODO: add sentry
    throw new Error('Router ID not found');
  }

  const allWeights = routerVaultIds.map((routerVaultId) => {
    const weight = weights.find((w) => w[0] === routerVaultId);
    return weight ? weight[1] : 0;
  });

  if (validateWeights(allWeights)) {
    // TODO: add sentry
    throw new Error('Weights are invalid');
  }

  // Get the token decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  const scaledAmount = scale(amount, tokenDecimals);
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (isETH) {
    tempOverrides.value = scaledAmount;
  }

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  // Simulate deposit
  try {
    if (isETH) {
      await mellowRouter.callStatic.depositEth(weights, tempOverrides);
    } else {
      await mellowRouter.callStatic.depositErc20(scaledAmount, weights);
    }
  } catch (error) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful deposit simulation.');
  }

  // Estimate gas
  if (isETH) {
    const gasLimit = await mellowRouter.estimateGas.depositEth(weights, tempOverrides);
    tempOverrides.gasLimit = getGasBuffer(gasLimit);
  } else {
    const gasLimit = await mellowRouter.estimateGas.depositErc20(
      scaledAmount,
      weights,
      tempOverrides,
    );
    tempOverrides.gasLimit = getGasBuffer(gasLimit);
  }

  const tx = isETH
    ? await mellowRouter.depositEth(weights, tempOverrides)
    : await mellowRouter.depositErc20(scaledAmount, weights, tempOverrides);

  const receipt = await tx.wait();
  return receipt;
};

export const depositAndRegister = async ({
  routerId,
  routerVaultIds,
  tokenId,
  amount,
  weights,
  registration,
  signer,
  network,
}: {
  routerId: string;
  routerVaultIds: string[];
  tokenId: string;
  amount: number;
  weights: [string, number][];
  registration: boolean;
  signer: ethers.Signer;
  network: string;
}): Promise<ethers.ContractReceipt> => {
  const config = getMellowConfig(network);

  const routerConfig = config.MELLOW_ROUTERS.find(
    (item) => item.router.toLowerCase() === routerId.toLowerCase(),
  );

  if (!routerConfig) {
    // TODO: add sentry
    throw new Error('Router ID not found');
  }

  const allWeights = routerVaultIds.map((routerVaultId) => {
    const weight = weights.find((w) => w[0] === routerVaultId);
    return weight ? weight[1] : 0;
  });

  if (validateWeights(allWeights)) {
    // TODO: add sentry
    throw new Error('Weights are invalid');
  }

  // Get the token decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  const scaledAmount = scale(amount, tokenDecimals);
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (isETH) {
    tempOverrides.value = scaledAmount;
  }

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  // Simulate deposit and register
  try {
    if (isETH) {
      mellowRouter.callStatic.depositEthAndRegisterForAutoRollover(
        weights,
        registration,
        tempOverrides,
      );
    } else {
      mellowRouter.callStatic.depositErc20AndRegisterForAutoRollover(
        scaledAmount,
        weights,
        registration,
      );
    }
  } catch (error) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful depositAndRegisterForAutoRollover simulation.');
  }

  // Estimate gas
  if (isETH) {
    const gasLimit = await mellowRouter.estimateGas.depositEthAndRegisterForAutoRollover(
      weights,
      registration,
      tempOverrides,
    );
    tempOverrides.gasLimit = getGasBuffer(gasLimit);
  } else {
    const gasLimit = await mellowRouter.estimateGas.depositErc20AndRegisterForAutoRollover(
      scaledAmount,
      weights,
      registration,
      tempOverrides,
    );
    tempOverrides.gasLimit = getGasBuffer(gasLimit);
  }

  // Send transaction
  const tx = isETH
    ? await mellowRouter.depositEthAndRegisterForAutoRollover(weights, registration, tempOverrides)
    : await mellowRouter.depositErc20AndRegisterForAutoRollover(
        scaledAmount,
        weights,
        registration,
        tempOverrides,
      );

  const receipt = await tx.wait();
  return receipt;
};

export const withdraw = async ({
  routerId,
  vaultId,
  routerVaultIds,
  signer,
}: {
  routerId: string;
  vaultId: string;
  routerVaultIds: string[];
  signer: ethers.Signer;
}): Promise<ethers.ContractReceipt> => {
  const vaultIndex = routerVaultIds.findIndex((item) => item === vaultId);
  if (vaultIndex < 0) {
    // Add Sentry
    throw new Error('Vault ID not found.');
  }

  const erc20RootVaultContract = new ethers.Contract(
    routerVaultIds[vaultIndex],
    Erc20RootVaultABI,
    signer,
  );

  const subvaultsCount: number = (await erc20RootVaultContract.subvaultNfts()).length;

  const minTokenAmounts = BigNumber.from(0);
  const vaultsOptions = new Array(subvaultsCount).fill(0x0);

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowRouter.callStatic.claimLPTokens(vaultIndex, [minTokenAmounts], vaultsOptions);
  } catch (err) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful claimLPTokens simulation.');
  }

  const gasLimit = await mellowRouter.estimateGas.claimLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
  );

  const tx = await mellowRouter.claimLPTokens(vaultIndex, [minTokenAmounts], vaultsOptions, {
    gasLimit: getGasBuffer(gasLimit),
  });

  const receipt = await tx.wait();
  return receipt;
};

export const rollover = async ({
  routerId,
  routerVaultIds,
  vaultId,
  weights,
  signer,
  network,
}: {
  routerId: string;
  routerVaultIds: string[];
  vaultId: string;
  weights: [string, number][];
  signer: ethers.Signer;
  network: string;
}): Promise<ethers.ContractReceipt> => {
  const vaultIndex = routerVaultIds.findIndex((item) => item === vaultId);
  if (vaultIndex < 0) {
    // Add Sentry
    throw new Error('Vault ID not found.');
  }

  const config = getMellowConfig(network);

  const routerConfig = config.MELLOW_ROUTERS.find(
    (item) => item.router.toLowerCase() === routerId.toLowerCase(),
  );

  if (!routerConfig) {
    // TODO: add sentry
    throw new Error('Router ID not found');
  }

  const allWeights = routerVaultIds.map((routerVaultId) => {
    const weight = weights.find((w) => w[0] === routerVaultId);
    return weight ? weight[1] : 0;
  });

  if (validateWeights(allWeights)) {
    // TODO: add sentry
    throw new Error('Weights are invalid');
  }

  const erc20RootVaultContract = new ethers.Contract(
    routerVaultIds[vaultIndex],
    Erc20RootVaultABI,
    signer,
  );

  const subvaultsCount: number = (await erc20RootVaultContract.subvaultNfts()).length;

  const minTokenAmounts = BigNumber.from(0);
  const vaultsOptions = new Array(subvaultsCount).fill(0x0);

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowRouter.callStatic.rolloverLPTokens(
      vaultIndex,
      [minTokenAmounts],
      vaultsOptions,
      weights,
    );
  } catch (err) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful rolloverLPTokens simulation.');
  }

  const gasLimit = await mellowRouter.estimateGas.rolloverLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
    weights,
  );

  const tx = await mellowRouter.rolloverLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
    weights,
    {
      gasLimit: getGasBuffer(gasLimit),
    },
  );

  const receipt = await tx.wait();
  return receipt;
};

export const registerForAutoRollover = async ({
  routerId,
  registration,
  signer,
}: {
  routerId: string;
  registration: boolean;
  signer: ethers.Signer;
}): Promise<ethers.ContractReceipt> => {
  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowRouter.callStatic.registerForAutoRollover(registration);
  } catch (err) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful auto-rollover registration simulation');
  }

  const gasLimit = await mellowRouter.estimateGas.registerForAutoRollover(registration);

  const tx = await mellowRouter.registerForAutoRollover(registration, {
    gasLimit: getGasBuffer(gasLimit),
  });

  const receipt = await tx.wait();
  return receipt;
};

export const getAutoRolloverRegistrationGasFee = async ({
  routerId,
  registration,
  provider,
  signer,
}: {
  routerId: string;
  registration: boolean;
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Signer;
}): Promise<number> => {
  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  const gasLimit = await mellowRouter.estimateGas.registerForAutoRollover(registration);
  const fee = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

  return fee;
};
