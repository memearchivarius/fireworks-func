import { Address, beginCell, Cell, OpenedContract, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { ExitCode, Fireworks, OPCODES } from '../wrappers/Fireworks';

// Constant with existing contract address
const CONTRACT_ADDRESS = 'EQCLUdiHnzWwqM2ce-NPKz4MVNaqIPNlYMPvco40YnCy1dod';

const MAX_UINT256 = (1n << 256n) - 1n;
const UNKNOWN_OPCODE_PLACEHOLDER = 123;
const msg_value = '0.05';

type FakeScenario = {
    exitCode: number;
    description: string;
    defaultValue: string;
    defaultMode?: number;
};

const SCENARIOS: Record<string, FakeScenario> = {
    success: { exitCode: ExitCode.Success, description: 'Return 0 (success path)', defaultValue: msg_value },
    'success-alt': { exitCode: ExitCode.SuccessAlt, description: 'RETALT (exit 1)', defaultValue: msg_value },
    'stack-underflow': { exitCode: ExitCode.StackUnderflow, description: 'Drop stack below zero', defaultValue: msg_value },
    'stack-overflow': { exitCode: ExitCode.StackOverflow, description: 'Continuation overflow', defaultValue: msg_value },
    'integer-overflow': { exitCode: ExitCode.IntegerOverflow, description: 'Max uint256 + 1', defaultValue: msg_value },
    'integer-out-of-range': { exitCode: ExitCode.IntegerOutOfRange, description: 'Signed integer overflow', defaultValue: msg_value },
    'invalid-opcode': { exitCode: ExitCode.InvalidOpcode, description: 'Unknown TVM opcode', defaultValue: msg_value },
    'type-check': { exitCode: ExitCode.TypeCheckError, description: 'Tuple destruct mismatch', defaultValue: msg_value },
    'cell-overflow': { exitCode: ExitCode.CellOverflow, description: 'Builder overflow (8)', defaultValue: msg_value },
    'cell-underflow': { exitCode: ExitCode.CellUnderflow, description: 'Slice underflow (9)', defaultValue: msg_value },
    'dictionary-error': { exitCode: ExitCode.DictionaryError, description: 'Dictionary reference mismatch (10)', defaultValue: msg_value },
    'unknown-error': { exitCode: ExitCode.UnknownError, description: 'SENDMSG failure (11)', defaultValue: msg_value },
    'out-of-gas': { exitCode: ExitCode.OutOfGasError, description: 'Compute out of gas (expect -14 result)', defaultValue: '0.003' },
    'unknown-op': { exitCode: UNKNOWN_OPCODE_PLACEHOLDER, description: 'Produces 0xffff (ERR_UNKNOWN_OP)', defaultValue: msg_value },
    'action-list-invalid': { exitCode: ExitCode.ActionListInvalid, description: 'Action list is not parsable (32)', defaultValue: msg_value },
    'action-list-too-long': { exitCode: ExitCode.ActionListTooLong, description: 'Action list is too long (33)', defaultValue: msg_value },
    'action-invalid': { exitCode: ExitCode.ActionInvalid, description: 'Unsupported action in list (34)', defaultValue: msg_value },
    'invalid-src-addr': { exitCode: ExitCode.InvalidSrcAddr, description: 'Invalid source address in outbound msg (35)', defaultValue: msg_value, defaultMode: 0 },
    'invalid-dst-addr': { exitCode: ExitCode.InvalidDstAddr, description: 'Invalid destination address (36)', defaultValue: msg_value },
    'not-enough-ton': { exitCode: ExitCode.NotEnoughTON, description: 'Insufficient TON for action (37)', defaultValue: msg_value },
    'not-enough-extra': { exitCode: ExitCode.NotEnoughExtraCurrencies, description: 'Extra currencies missing (38)', defaultValue: msg_value },
    'not-enough-funds': { exitCode: ExitCode.NotEnoughFunds, description: 'Not enough funds to process (40)', defaultValue: msg_value },
    'lib-out-of-limit': { exitCode: ExitCode.LibOutOfLimit, description: 'Library size exceeds limits (43)', defaultValue: msg_value },
};

// Group scenarios for easy selection by index
const SCENARIO_MENU = [
    // Compute phase errors (0-12)
    'success', 'success-alt', 'stack-underflow', 'stack-overflow', 'integer-overflow',
    'integer-out-of-range', 'invalid-opcode', 'type-check', 'cell-overflow',
    'cell-underflow', 'dictionary-error', 'unknown-error', 'out-of-gas', 'unknown-op',
    // Action phase errors (14-22)
    'action-list-invalid', 'action-list-too-long', 'action-invalid', 'invalid-src-addr',
    'invalid-dst-addr', 'not-enough-ton', 'not-enough-extra', 'not-enough-funds', 'lib-out-of-limit'
];

// Simplified menu display function
function showScenarioMenu() {
    console.log('\n=== Available Fake Scenarios ===');
    console.log('\nCompute phase errors:');
    SCENARIO_MENU.slice(0, 14).forEach((name, index) => {
        const scenario = SCENARIOS[name];
        console.log(`${index.toString().padStart(2)}. ${name.padEnd(20)} - ${scenario.description}`);
    });
    
    console.log('\nAction phase errors:');
    SCENARIO_MENU.slice(14).forEach((name, index) => {
        const globalIndex = index + 14;
        const scenario = SCENARIOS[name];
        console.log(`${globalIndex.toString().padStart(2)}. ${name.padEnd(20)} - ${scenario.description}`);
    });
    console.log('\nUsage: bun blueprint run fakeFireworks --testnet --tonconnect index <number>\n');
}

type BuildOptions = { mode?: number };

// Simplified run function
export async function run(provider: NetworkProvider) {
    // Parse arguments in blueprint format: index <number>
    const rawArgs = process.argv.slice(2); // Get all command line arguments
    
    let scenarioName: string;
    let scenario: FakeScenario;
    
    // Look for index in arguments
    const indexIndex = rawArgs.indexOf('index');
    
    if (indexIndex !== -1 && indexIndex + 1 < rawArgs.length) {
        const indexValue = parseInt(rawArgs[indexIndex + 1]);
        if (isNaN(indexValue) || indexValue < 0 || indexValue >= SCENARIO_MENU.length) {
            throw new Error(`Invalid index ${indexValue}. Available range: 0-${SCENARIO_MENU.length - 1}`);
        }
        scenarioName = SCENARIO_MENU[indexValue];
        scenario = SCENARIOS[scenarioName];
        console.log(`[fake] Selected scenario by index ${indexValue}: ${scenarioName}`);
    } else if (rawArgs.length === 0 || rawArgs.includes('menu')) {
        // Interactive mode
        showScenarioMenu();
        
        // Request user input
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const question = (prompt: string): Promise<string> => {
            return new Promise((resolve) => {
                rl.question(prompt, (answer: string) => {
                    resolve(answer);
                });
            });
        };
        
        const answer = await question('\nEnter scenario number: ');
        rl.close();
        
        const indexValue = parseInt(answer.trim());
        if (isNaN(indexValue) || indexValue < 0 || indexValue >= SCENARIO_MENU.length) {
            throw new Error(`Invalid index ${indexValue}. Available range: 0-${SCENARIO_MENU.length - 1}`);
        }
        
        scenarioName = SCENARIO_MENU[indexValue];
        scenario = SCENARIOS[scenarioName];
        console.log(`[fake] Selected scenario by index ${indexValue}: ${scenarioName}`);
    } else {
        // Show menu if index not found
        showScenarioMenu();
        return;
    }

    // Use existing contract
    const fireworks = provider.open(Fireworks.createFromAddress(Address.parse(CONTRACT_ADDRESS)));
    console.log(`[fake] Using contract at ${fireworks.address.toString()}`);
    
    const exitCode = scenario.exitCode;
    const mode = scenario.defaultMode;
    const body = buildFakeLaunchBody(exitCode, { mode });
    
    console.log(`[fake] Sending scenario "${scenarioName}" (exit=${exitCode}, mode=${mode ?? 0}, value=${scenario.defaultValue} TON) ...`);
    await fireworks.sendBadMessage(provider.sender(), toNano(scenario.defaultValue), body);
    console.log('[fake] Message delivered, inspect the receiver transactions to see the resulting exit code.');
}

function buildFakeLaunchBody(exitCode: number, options: BuildOptions = {}): Cell {
    const normalizedExitCode = ((exitCode % 256) + 256) % 256;
    const builder = beginCell().storeUint(OPCODES.FAKED_LAUNCH, 32).storeUint(normalizedExitCode, 8);

    const appendEmptyRef = () => builder.storeRef(beginCell().endCell());

    if (exitCode >= ExitCode.ActionListInvalid) {
        const rawMode = options.mode ?? 0;
        builder.storeUint(rawMode & 0xff, 8);
        appendEmptyRef();
    }

    switch (exitCode) {
        case ExitCode.IntegerOverflow:
            builder.storeUint(MAX_UINT256, 256);
            break;
        case ExitCode.IntegerOutOfRange:
            builder.storeInt(-5, 8);
            break;
        case ExitCode.CellOverflow: {
            const payload = beginCell()
                .storeUint(1, 256)
                .storeUint(2, 256)
                .storeUint(3, 256)
                .storeUint(4, 255)
                .endCell();
            builder.storeRef(payload);
            break;
        }
        case ExitCode.CellUnderflow:
        case ExitCode.DictionaryError:
        case ExitCode.UnknownError:
        case ExitCode.OutOfGasError:
            appendEmptyRef();
            break;
        default:
            if (exitCode === UNKNOWN_OPCODE_PLACEHOLDER) {
                appendEmptyRef();
            }
            break;
    }

    return builder.endCell();
}
