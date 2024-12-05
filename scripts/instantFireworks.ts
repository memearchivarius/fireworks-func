import { toNano } from '@ton/core';
import { Fireworks } from '../wrappers/Fireworks';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const fireworks = provider.open(
        Fireworks.createFromConfig(
            {
                id: 0x0923 /*Math.floor(Math.random() * 10000)*/,
            },
            await compile('Fireworks')
        )
    );

    await fireworks.sendDeployLaunch(provider.sender(), toNano('3.6'));
    // await provider.waitForDeploy(fireworks.address); we have to skip this checker, because contract instantly destroyed

    console.log('Fireworks launched on ', fireworks.address, 'address');
}
