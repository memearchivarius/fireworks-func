import { toNano } from '@ton/core';
import { Fireworks } from '../wrappers/Fireworks';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const fireworks = provider.open(
        Fireworks.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
            },
            await compile('Fireworks')
        )
    );

    await fireworks.sendDeployLaunch(provider.sender(), toNano('2.52'));
    // await provider.waitForDeploy(fireworks.address); we have to skip this checker, because contract instantly destroyed

    console.log('Fireworks launched on ', fireworks.address, 'address');
    console.log(fireworks.init!.code.hash())
}

//https://testnet.tonviewer.com/transaction/f9c7575f9796dbffdf8701dd71dbe95b97262fb124b37f40053d52aa0b52b3b3