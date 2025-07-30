import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
	createPublicClient,
	erc20Abi,
	getContract,
	http,
	parseEther,
	zeroAddress,
} from "viem";
import { expect, describe } from "vitest";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { testWithRpc } from "../utils/testWithRpc";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { prepareUserOperationForErc20Paymaster } from "permissionless/experimental/pimlico";
import { foundry } from "viem/chains";
import { erc20Address, sudoMintTokens } from "@pimlico/mock-paymaster";

describe("Basic test cases", () => {
	testWithRpc("Can send a sponsored ERC20 userOperation", async ({ rpc }) => {
		const { anvilRpc, altoRpc, paymasterRpc } = rpc;

		// Setup clients.
		const publicClient = createPublicClient({
			chain: foundry,
			transport: http(anvilRpc),
		});

		const pimlicoClient = createPimlicoClient({
			chain: foundry,
			transport: http(paymasterRpc),
		});

		const account = await toSimpleSmartAccount({
			client: publicClient,
			owner: privateKeyToAccount(generatePrivateKey()),
		});

		// Creating smart account client based on this page
		// http://docs.pimlico.io/guides/how-to/erc20-paymaster/how-to/use-paymaster
		const smartAccountClient = createSmartAccountClient({
			chain: foundry,
			account,
			bundlerTransport: http(altoRpc),
			paymaster: pimlicoClient,
			userOperation: {
				estimateFeesPerGas: async () =>
					(await pimlicoClient.getUserOperationGasPrice()).fast,
				prepareUserOperation:
					prepareUserOperationForErc20Paymaster(pimlicoClient),
			},
		});

		// Fund the SmartAccount with ERC-20 tokens.
		await sudoMintTokens({
			amount: parseEther("1"),
			to: account.address,
			anvilRpc,
		});

		// Check smartAccount balance before and after sending transaction to confirm balance decreased.
		const erc20 = getContract({
			address: erc20Address,
			abi: erc20Abi,
			client: publicClient,
		});

		const balanceBefore = await erc20.read.balanceOf([account.address]);

		// Send a transaction and wait for receipt.
		const userOpHash = await smartAccountClient.sendUserOperation({
			calls: [
				{
					to: zeroAddress,
					value: 0n,
					data: "0x",
				},
			],
			paymasterContext: {
				token: erc20Address,
			},
		});

		const receipt = await smartAccountClient.waitForUserOperationReceipt({
			hash: userOpHash,
		});

		const balanceAfter = await erc20.read.balanceOf([account.address]);

		// UserOperation should be included successfully.
		expect(receipt.success).toBe(true);
		expect(balanceAfter).toBeLessThan(balanceBefore);
	});
});
