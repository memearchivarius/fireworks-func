# Fireworks

Special demo contract for gas fees and send modes in TON Blockchain.

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from @ton/core) for the contracts, including any (de)serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly for deployment.

## How to use

### Build

```bash
bun run build
# or
npx blueprint build
```

### Test

```bash
bun test
# or
npx blueprint test
```

### Scripts

The project includes three deployment and testing scripts:

#### 1. `deployFireworks` - Deploy root contract only

Deploys the root Fireworks contract without triggering any launches.

**Usage:**
```bash
bun blueprint run deployFireworks
```

**Options:**
- `--id <number>` - Contract ID (default: current timestamp)
- `--value <string>` - Deployment value in TON (default: `0.05`)

**Examples:**
```bash
# Deploy with default settings
bun blueprint run deployFireworks

# Deploy with custom ID and value
bun blueprint run deployFireworks --id 42 --value 0.1
```

#### 2. `instantFireworks` - Deploy and launch all send modes

Deploys the root contract and immediately triggers `SET_FIRST`, which launches all 12 send modes through 7 child contracts.

**Usage:**
```bash
bun blueprint run instantFireworks
```

**Options:**
- `--id <number>` - Contract ID (default: current timestamp)
- `--deploy-value <string>` - Deployment value in TON (default: `0.05`)
- `--value <string>` - Launch message value in TON (default: `3`)

**Examples:**
```bash
# Deploy and launch with default settings
bun blueprint run instantFireworks

# Custom deployment and launch values
bun blueprint run instantFireworks --deploy-value 0.1 --value 3.5
```

**Result:** Creates 6 messages from `LaunchFirst` (modes 0/1/2/16/17/160) + 6 follow-up child launches (modes 64/65/80/81/128/144).

#### 3. `fakeFireworks` - Test edge cases and exit codes

Tests various exit codes and edge cases by sending `FAKED_LAUNCH` messages to contract.

**Usage:**
```bash
# Show menu of available scenarios (interactive mode)
bun blueprint run fakeFireworks --testnet menu

# Run scenario by index (recommended)
bun blueprint run fakeFireworks --testnet index <number>

# Show menu without interactive input
bun blueprint run fakeFireworks --testnet
```

**Arguments:**
- `index <number>` - Run scenario by index (0-22)
- `menu` - Show available scenarios menu and enable interactive selection

**Quick Reference (by index):**

**Compute phase errors (0-13):**
- `0` - success - Return 0 (success path)
- `1` - success-alt - RETALT (exit 1)
- `2` - stack-underflow - Drop stack below zero
- `3` - stack-overflow - Continuation overflow
- `4` - integer-overflow - Max uint256 + 1
- `5` - integer-out-of-range - Signed integer overflow
- `6` - invalid-opcode - Unknown TVM opcode
- `7` - type-check - Tuple destruct mismatch
- `8` - cell-overflow - Builder overflow (8)
- `9` - cell-underflow - Slice underflow (9)
- `10` - dictionary-error - Dictionary reference mismatch (10)
- `11` - unknown-error - SENDMSG failure (11)
- `12` - out-of-gas - Compute out of gas (expect -14 result)
- `13` - unknown-op - Produces 0xffff (ERR_UNKNOWN_OP)

**Action phase errors (14-22):**
- `14` - action-list-invalid - Action list is not parsable (32)
- `15` - action-list-too-long - Action list is too long (33)
- `16` - action-invalid - Unsupported action in list (34)
- `17` - invalid-src-addr - Invalid source address in outbound msg (35)
- `18` - invalid-dst-addr - Invalid destination address (36)
- `19` - not-enough-ton - Insufficient TON for action (37)
- `20` - not-enough-extra - Extra currencies missing (38)
- `21` - not-enough-funds - Not enough funds to process (40)
- `22` - lib-out-of-limit - Library size exceeds limits (43)

**Examples:**
```bash
# Show available scenarios
bun blueprint run fakeFireworks --testnet

# Interactive mode - show menu and select scenario
bun blueprint run fakeFireworks --testnet menu

# Test success scenario (index 0)
bun blueprint run fakeFireworks --testnet index 0

# Test invalid source address (default, index 17)
bun blueprint run fakeFireworks --testnet

# Test stack overflow (index 3)
bun blueprint run fakeFireworks --testnet index 3

# Test out of gas scenario (index 12)
bun blueprint run fakeFireworks --testnet index 12

# Test action list invalid (index 14)
bun blueprint run fakeFireworks --testnet index 14
