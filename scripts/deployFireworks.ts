import { toNano } from '@ton/core';
import { Fireworks } from '../wrappers/Fireworks';
import { compile, NetworkProvider } from '@ton/blueprint';

const DEFAULT_DEPLOY_VALUE = '0.05';

export async function run(provider: NetworkProvider) {
    // Parse arguments in blueprint format: id <number> value <string>
    const rawArgs = process.argv.slice(2); // Get all command line arguments
    
    // Find id argument
    const idIndex = rawArgs.indexOf('id');
    const requestedId = idIndex !== -1 && idIndex + 1 < rawArgs.length
        ? parseInt(rawArgs[idIndex + 1])
        : undefined;
    
    // Find value argument
    const valueIndex = rawArgs.indexOf('value');
    const deployValue = valueIndex !== -1 && valueIndex + 1 < rawArgs.length
        ? rawArgs[valueIndex + 1]
        : DEFAULT_DEPLOY_VALUE;
    
    const configId = requestedId ?? Math.floor(Date.now() / 1000);

    const code = await compile('Fireworks');
    const fireworks = provider.open(Fireworks.createFromConfig({ id: configId }, code));

    console.log(`[deploy] Deploying Fireworks (id=${configId}) with ${deployValue} TON...`);
    await fireworks.sendDeploy(provider.sender(), toNano(deployValue));
    await provider.waitForDeploy(fireworks.address);

    const codeHash = fireworks.init?.code.hash().toString('hex');
    console.log(`[deploy] Contract deployed at ${fireworks.address.toString()}`);
    console.log(`[deploy] Init code hash: ${codeHash}`);
}
