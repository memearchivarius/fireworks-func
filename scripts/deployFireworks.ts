import { toNano } from '@ton/core';
import { Fireworks } from '../wrappers/Fireworks';
import { compile, NetworkProvider } from '@ton/blueprint';
import { getNumberArg, getStringArg, parseArgs } from './cli';

const DEFAULT_DEPLOY_VALUE = '0.05';

export async function run(provider: NetworkProvider) {
    const args = parseArgs();
    const requestedId = getNumberArg(args, 'id');
    const configId = requestedId ?? Math.floor(Date.now() / 1000);
    const deployValue = getStringArg(args, 'value') ?? DEFAULT_DEPLOY_VALUE;

    const code = await compile('Fireworks');
    const fireworks = provider.open(Fireworks.createFromConfig({ id: configId }, code));

    console.log(`[deploy] Deploying Fireworks (id=${configId}) with ${deployValue} TON...`);
    await fireworks.sendDeploy(provider.sender(), toNano(deployValue));
    await provider.waitForDeploy(fireworks.address);

    const codeHash = fireworks.init?.code.hash().toString('hex');
    console.log(`[deploy] Contract deployed at ${fireworks.address.toString()}`);
    console.log(`[deploy] Init code hash: ${codeHash}`);
}
