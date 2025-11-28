import { toNano } from '@ton/core';
import { Fireworks } from '../wrappers/Fireworks';
import { compile, NetworkProvider } from '@ton/blueprint';
import { getNumberArg, getStringArg, parseArgs } from './cli';

const DEFAULT_DEPLOY_VALUE = '0.05';
const DEFAULT_LAUNCH_VALUE = '3';

export async function run(provider: NetworkProvider) {
    const args = parseArgs();
    const requestedId = getNumberArg(args, 'id');
    const configId = requestedId ?? Math.floor(Date.now() / 1000);
    const deployValue = getStringArg(args, 'deploy-value') ?? DEFAULT_DEPLOY_VALUE;
    const launchValue = getStringArg(args, 'value') ?? DEFAULT_LAUNCH_VALUE;

    const code = await compile('Fireworks');
    const fireworks = provider.open(Fireworks.createFromConfig({ id: configId }, code));

    console.log(`[instant] Deploying root contract (id=${configId}) with ${deployValue} TON...`);
    await fireworks.sendDeploy(provider.sender(), toNano(deployValue));
    await provider.waitForDeploy(fireworks.address);

    console.log(`[instant] Broadcasting SET_FIRST with ${launchValue} TON to trigger all send modes...`);
    await fireworks.sendDeployLaunch(provider.sender(), toNano(launchValue));

    const codeHash = fireworks.init?.code.hash().toString('hex');
    console.log('[instant] Launch message sent.');
    console.log('[instant] Root address: ', fireworks.address.toString());
    console.log('[instant] Init code hash: ', codeHash);
    console.log('[instant] Result: 6 messages from LaunchFirst (modes 0/1/2/16/17/160) + 6 follow-up child launches (modes 64/65/80/81/128/144).');
}
