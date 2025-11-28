import { toNano } from '@ton/core';
import { Fireworks } from '../wrappers/Fireworks';
import { compile, NetworkProvider } from '@ton/blueprint';

const DEFAULT_DEPLOY_VALUE = '0.05';
const DEFAULT_LAUNCH_VALUE = '3';

export async function run(provider: NetworkProvider) {
    // Parse arguments in blueprint format: id <number> deploy-value <string> value <string>
    const rawArgs = process.argv.slice(2); // Get all command line arguments
    
    // Find id argument
    const idIndex = rawArgs.indexOf('id');
    const requestedId = idIndex !== -1 && idIndex + 1 < rawArgs.length
        ? parseInt(rawArgs[idIndex + 1])
        : undefined;
    
    // Find deploy-value argument
    const deployValueIndex = rawArgs.indexOf('deploy-value');
    const deployValue = deployValueIndex !== -1 && deployValueIndex + 1 < rawArgs.length
        ? rawArgs[deployValueIndex + 1]
        : DEFAULT_DEPLOY_VALUE;
    
    // Find value argument (for launch)
    const valueIndex = rawArgs.indexOf('value');
    const launchValue = valueIndex !== -1 && valueIndex + 1 < rawArgs.length
        ? rawArgs[valueIndex + 1]
        : DEFAULT_LAUNCH_VALUE;
    
    const configId = requestedId ?? Math.floor(Date.now() / 1000);

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
