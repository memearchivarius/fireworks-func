import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/fireworks/fireworks.tolk',
    withSrcLineComments: true,
    withStackComments: true,
};
