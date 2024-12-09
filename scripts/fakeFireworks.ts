import { toNano, beginCell, Cell } from '@ton/core';
import { ExitCode, Fireworks, OPCODES } from '../wrappers/Fireworks';
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
    const body = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(ExitCode.InvalidSrcAddr, 8).storeUint(144, 8).endCell();
    // mode 80 = 64+16 carry value and bounce on action fail
    await fireworks.sendBadMessage(provider.sender(), toNano('2.4'), body);
    // await provider.waitForDeploy(fireworks.address); we have to skip this checker, because contract instantly destroyed

    console.log('Fireworks launched on ', fireworks.address, 'address');
    console.log(fireworks.init!.code.hash())
}
