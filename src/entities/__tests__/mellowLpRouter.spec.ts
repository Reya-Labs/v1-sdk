import { providers, Wallet } from "ethers";
import JSBI from "jsbi";
import MellowLpRouter from "../mellowLpRouter";
import { ethers } from "ethers";

const provider = new providers.JsonRpcProvider;

describe("mellowLpMultiVaultRouter tests", () => {

    let userWallet: Wallet;
    let provider: providers.JsonRpcProvider;
    let mellowRouter: MellowLpRouter;

    const mellowRouterAddress = ""
    const defaultWeights: number[] = [];
    const erc20RootVaultAddress = "";
    const erc20RootVaultGovernanceAddress = "";

    // Need to initiate min. 2 pools to test the multi vault deposit mechanisms
    // Ideally 2 eth vaults and 2 erc 20 vaults for testing. 

    beforeAll(async () => {
        mellowRouter = new MellowLpRouter(
            {
                mellowRouterAddress: mellowRouterAddress,
                defaultWeights: defaultWeights,
                erc20RootVaultAddress: erc20RootVaultAddress,
                erc20RootVaultGovernanceAddress: erc20RootVaultGovernanceAddress,
                provider,
            }
        );
    });

    describe("Deposit funds into router", async () => {

        // Write presets here if any are needed

        it("User deposits 1 ETH into router", async () => {

            // 0. Eth deposit needs only weights not amount
            const amount = ethers.constants.One.toNumber();
            const weights = [0, 10]

            // 1. User deposits 1 ETH into router contract
            mellowRouter.deposit(amount, weights);






        })
    })
})