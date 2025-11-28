export type CliArgs = Record<string, string | boolean>;

export function parseArgs(argv: string[] = process.argv.slice(2)): CliArgs {
    const result: CliArgs = {};

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) {
            continue;
        }

        const eqIndex = token.indexOf('=');
        if (eqIndex !== -1) {
            const key = token.slice(2, eqIndex);
            const value = token.slice(eqIndex + 1);
            result[key] = value;
            continue;
        }

        const key = token.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
            result[key] = next;
            i += 1;
        } else {
            result[key] = true;
        }
    }

    return result;
}

export function getStringArg(args: CliArgs, key: string): string | undefined {
    const value = args[key];
    return typeof value === 'string' ? value : undefined;
}

export function getNumberArg(args: CliArgs, key: string): number | undefined {
    const raw = getStringArg(args, key);
    if (raw === undefined) {
        return undefined;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
        throw new Error(`Argument "--${key}" must be a number, got "${raw}"`);
    }
    return parsed;
}

export function getBooleanArg(args: CliArgs, key: string): boolean {
    return args[key] === true;
}

