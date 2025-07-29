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

describe("Basic test cases", () => {
	testWithRpc("Can send a non sponsored userOperation", async ({ rpc }) => {
		const { anvilRpc, altoRpc } = rpc;

		const client = createPublicClient({
			transport: http(anvilRpc),
		});

		const account = await toSimpleSmartAccount({
			client,
			owner: privateKeyToAccount(generatePrivateKey()),
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

		const smartAccountClient = createSmartAccountClient({
			account,
			bundlerTransport: http(altoRpc),
		});

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

		const client = createPublicClient({
			transport: http(anvilRpc),
		});

		const account = await toSimpleSmartAccount({
			client,
			owner: privateKeyToAccount(generatePrivateKey()),
		});

		// Setup paymaster client.
		const pimlicoClient = createPimlicoClient({
			transport: http(paymasterRpc),
		});

		const smartAccountClient = createSmartAccountClient({
			account,
			bundlerTransport: http(altoRpc),
			paymaster: pimlicoClient,
		});

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
});
