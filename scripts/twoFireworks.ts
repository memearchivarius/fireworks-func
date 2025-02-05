import { toNano, beginCell, Cell, SendMode } from '@ton/core';
import { ExitCode, Fireworks, OPCODES } from '../wrappers/Fireworks';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const fireworks1 = provider.open(
        Fireworks.createFromConfig(
            {
                id: 0x0923 /*Math.floor(Math.random() * 10000)*/,
            },
            await compile('Fireworks')
        )
    );

    await fireworks1.sendDeploy(provider.sender(), toNano('1.000286')); // trying to get 1 TON exactly
    await provider.waitForDeploy(fireworks1.address);

   const fireworks2 = provider.open(
        Fireworks.createFromConfig(
            {
                id: 0x0924 ,
            },
            await compile('Fireworks')
        )
    );    

    await fireworks2.sendDeploy(provider.sender(), toNano('1.000286'));
    await provider.waitForDeploy(fireworks2.address);
    
    const body_payload = beginCell()
        .storeUint(0x00000923, 32) // op_code
        .storeUint(3, 8) // msg_mode for fw1 to fw2 message 
        .storeAddress(fireworks2.address) //sender address payload
        .storeUint(0x00000041, 32) // sendop
        .endCell();
    
    await fireworks1.sendLaunch(provider.sender(), {value: toNano('0.1'), mode: SendMode.PAY_GAS_SEPARATELY, msg: body_payload})
    // sending custom_msg() from fireworks1 to fireworks2
}
