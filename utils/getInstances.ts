import { paymaster } from "@pimlico/mock-paymaster";
import { anvil, alto } from "prool/instances";
import {
	entryPoint06Address,
	entryPoint07Address,
	entryPoint08Address,
} from "viem/account-abstraction";
import { foundry } from "viem/chains";

// Private key for Anvil account 0.
const pk = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export const getInstances = async ({
	forkUrl,
	anvilPort,
	altoPort,
	paymasterPort,
}: {
	forkUrl: string;
	anvilPort: number;
	altoPort: number;
	paymasterPort: number;
}) => {
	const anvilRpc = `http://localhost:${anvilPort}`;
	const altoRpc = `http://localhost:${altoPort}`;

	const anvilInstance = anvil({
		port: anvilPort,
		chainId: foundry.id,
		hardfork: "Prague",
		forkUrl,
	});

	const altoInstance = alto({
		port: altoPort,
		entrypoints: [
			entryPoint06Address,
			entryPoint07Address,
			entryPoint08Address,
		],
		rpcUrl: anvilRpc,
		executorPrivateKeys: [pk],
		utilityPrivateKey: pk,
		safeMode: false,
	});

	const paymasterInstance = paymaster({
		anvilRpc,
		altoRpc,
		port: paymasterPort,
	});

	// Uncomment these to print logs to stdout.

	//anvilInstance.on("stderr", (data) => {
	//	console.error(data.toString());
	//});
	//anvilInstance.on("stdout", (data) => {
	//	console.log(data.toString());
	//});

	//altoInstance.on("stderr", (data) => {
	//	console.error(data.toString());
	//});
	//altoInstance.on("stdout", (data) => {
	//	console.log(data.toString());
	//});

	//paymasterInstance.on("stderr", (data) => {
	//	console.error(data.toString());
	//});
	//paymasterInstance.on("stdout", (data) => {
	//	console.log(data.toString());
	//});

	await anvilInstance.start();
	await altoInstance.start();
	await paymasterInstance.start();

	return [anvilInstance, altoInstance, paymasterInstance];
};
