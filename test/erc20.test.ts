import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
	createPublicClient,
	createTestClient,
	http,
	parseEther,
	zeroAddress,
} from "viem";
import { assert, describe } from "vitest";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { testWithRpc } from "../utils/testWithRpc";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { foundry } from "viem/chains";

describe("Basic test cases", () => {
	testWithRpc("Can send a non sponsored userOperation", async ({ rpc }) => {
		const { anvilRpc, altoRpc } = rpc;

		// Setup clients.
		const publicClient = createPublicClient({
			chain: foundry,
			transport: http(anvilRpc),
		});

		const pimlicoClient = createPimlicoClient({
			chain: foundry,
			transport: http(altoRpc),
		});

		const account = await toSimpleSmartAccount({
			client: publicClient,
			owner: privateKeyToAccount(generatePrivateKey()),
		});

		const smartAccountClient = createSmartAccountClient({
			chain: foundry,
			account,
			bundlerTransport: http(altoRpc),
			userOperation: {
				estimateFeesPerGas: async () =>
					(await pimlicoClient.getUserOperationGasPrice()).fast,
			},
		});

		// Fund the SmartAccount.
		const anvilClient = createTestClient({
			transport: http(anvilRpc),
			mode: "anvil",
		});
		await anvilClient.setBalance({
			address: account.address,
			value: parseEther("1"),
		});

		// Send userOperation and wait for receipt.
		const userOpHash = await smartAccountClient.sendUserOperation({
			calls: [
				{
					to: zeroAddress,
					value: 0n,
					data: "0x",
				},
			],
		});

		const receipt = await smartAccountClient.waitForUserOperationReceipt({
			hash: userOpHash,
		});

		// UserOperation should be included successfully.
		assert(receipt.success);
	});

	testWithRpc("Can send a sponsored userOperation", async ({ rpc }) => {
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

		const smartAccountClient = createSmartAccountClient({
			account,
			bundlerTransport: http(altoRpc),
			paymaster: pimlicoClient,
			userOperation: {
				estimateFeesPerGas: async () =>
					(await pimlicoClient.getUserOperationGasPrice()).fast,
			},
		});

		// Send userOperation and wait for receipt.
		const userOpHash = await smartAccountClient.sendTransaction({
			calls: [
				{
					to: zeroAddress,
					value: 0n,
					data: "0x",
				},
			],
		});

		const receipt = await smartAccountClient.waitForUserOperationReceipt({
			hash: userOpHash,
		});

		// UserOperation should be included successfully.
		assert(receipt.success);
	});
});
