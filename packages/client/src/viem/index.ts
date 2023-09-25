// @ts-nocheck
import { createWalletClient, createPublicClient, custom, http, WalletClient, createClient } from "viem";
import { polygonMumbai } from 'viem/chains';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts'

import { getChainConfig } from "../config";
import { NetworkEnum, ViemClientConfig } from "../types";
import TalentLayerID from "../contracts/ABI/TalentLayerID.json"

export class ViemClient {
    client: WalletClient;
    publicClient;

    constructor(config: ViemClientConfig) {

        // initialise a default public wallet client;
        this.client = createWalletClient({
            chain: polygonMumbai,
            transport: http()
        })
        this.publicClient = createPublicClient({
            chain: polygonMumbai,
            transport: http()
        })

        // attempt to override the public client based on
        // config provided by the consumer
        this.setupViemClient(config);
    }

    setupViemClient(config: ViemClientConfig): boolean {

        const rpcUrl = config?.rpcUrl;
        const transportProtocol = rpcUrl ? http(rpcUrl) : http();

        if (config?.privateKey) {
            const account = privateKeyToAccount(config.privateKey);
            this.client = createWalletClient({
                account,
                chain: polygonMumbai,
                transport: transportProtocol
            })

            return true;
        }

        if (config?.mnemonic) {
            const account = mnemonicToAccount(config.mnemonic);
            this.client = createWalletClient({
                account,
                chain: polygonMumbai,
                transport: transportProtocol
            })

            return true;
        }

        let browserProvider = globalThis?.ethereum || window?.ethereum;
        if (browserProvider) {
            this.client = createWalletClient({
                chain: polygonMumbai,
                transport: custom(browserProvider)
            });
            return true;
        }

        return false;
    }

    public async writeContract(contractName: string, functionName: string, args: Array, value?: bigint) {
        const [address] = await this.client.getAddresses()

        if (!address) {
            throw Error("Wallet Client not initialised properly");
        }

        const chainConfig = getChainConfig(NetworkEnum.MUMBAI);
        const contract = chainConfig.contracts[contractName];

        if (!contract) {
            throw Error("Invalid contract name passed.");
        }

        return this.client.writeContract({
            address: contract.address,
            abi: contract.abi,
            functionName,
            args,
            account: address,
            value
        })

    }

    public async readContract(contractName: string, functionName: string, args: Array) {
        const chainConfig = getChainConfig(NetworkEnum.MUMBAI);
        const contract = chainConfig.contracts[contractName];

        if (!contract) {
            throw Error("Invalid contract name passed.");
        }

        return this.publicClient.readContract({
            address: contract.address,
            abi: contract.abi,
            functionName,
            args
        })
    }

    public async updateProfileData(userId: string, cid: string) {
        const [address] = await this.client.getAddresses()

        if (!address) {
            throw Error("Wallet Client not initialised properly");
        }

        const chainConfig = getChainConfig(NetworkEnum.MUMBAI);

        return this.client.writeContract({
            address: chainConfig.contracts.talentLayerId,
            abi: TalentLayerID.abi,
            functionName: 'updateProfileData',
            args: [userId, cid],
            account: address
        });
    }
};