tolk 1.2

import "@stdlib/tvm-dicts"
import "storage"
import "messages"
import "errors"

const ONE_TON: coins = ton("1")
const MIN_BALANCE: coins = ton("0.125") // ONE_TON / 8

// Comments
const MSG_COMMENT_0 = "send mode = 0"
const MSG_COMMENT_1 = "send mode = 1"
const MSG_COMMENT_2 = "send mode = 2"
const MSG_COMMENT_16 = "send_mode = 16"
const MSG_COMMENT_17 = "send_mode = 17"
const MSG_COMMENT_32 = "send_mode = 32"
const MSG_COMMENT_64 = "send_mode = 64"
const MSG_COMMENT_65 = "send_mode = 65"
const MSG_COMMENT_80 = "send_mode = 80"
const MSG_COMMENT_81 = "send_mode = 81"
const MSG_COMMENT_128 = "send_mode = 128"
const MSG_COMMENT_144 = "send_mode = 144"
const MSG_COMMENT_160 = "send mode = 160"

fun returnAlt(): void
    asm "RETALT";

fun stackOverflow(): void
    asm """
    <{
    }>CONT // c
    0 SETNUMARGS // c'
    2 PUSHINT // c' 2
    SWAP // 2 c'
    1 -1 SETCONTARGS
""";

fun errorOpcode(): void
    asm "x{D7FF} @addop";

fun setLibCode(code: cell, mode: int): void
    asm "SETLIBCODE";

fun setC5(actions: cell): void
    asm "c5 POP";

fun sendMsg(msg: cell, mode: int): int
    asm "SENDMSG";

// Using stdlib sendRawMessage for specific exit code

fun untuple4(t: tuple): (int, int, int, int)
    asm "4 UNTUPLE";

fun dropOne(): void
    asm "DROP";

fun impureTouch(x: int): void
    asm "NOP";

fun impureTouchCell(c: cell): void
    asm "NOP";

fun impureTouchCellOpt(c: cell?): void
    asm "NOP";

fun buildFireworkAddress(id: int32, initCode: cell): AutoDeployAddress {
    val initData = Storage { id }.toCell();
    return {
        stateInit: ContractState {
            code: initCode,
            data: initData
        }
    }
}

fun sendCommentMessage(amount: coins, mode: int, comment: slice, dest: address) {
    val outMsg = createMessage({
        bounce: true,
        dest: dest,
        value: amount,
        body: CommentMessage { comment: comment }
    });
    outMsg.send(mode);
}

fun fakeLaunch(errorCode: int, mode: int, data: slice) {
    if (errorCode == EXIT_SUCCESS) {
        return;
    } else if (errorCode == EXIT_STACK_UNDERFLOW) {
        repeat (100) {
            dropOne();
        }
    } else if (errorCode == EXIT_STACK_OVERFLOW) {
        stackOverflow();
    } else if (errorCode == EXIT_INTEGER_OVERFLOW) {
        var maxUint256 = data.loadUint(256);
        maxUint256 += 1;
        // Prevent optimization
        impureTouch(maxUint256);
    } else if (errorCode == EXIT_INTEGER_OUT_OF_RANGE) {
        val negativeNumber = data.loadInt(8);
        val invalidCell = beginCell().storeUint(negativeNumber, 8).endCell();
        impureTouchCell(invalidCell);
    } else if (errorCode == EXIT_INVALID_OPCODE) {
        errorOpcode();
    } else if (errorCode == EXIT_TYPE_CHECK_ERROR) {
        val t3 = [1, 2, 3] as tuple; // tuple with 3 elements
        val (a1, a2, a3, a4) = untuple4(t3); // This will fail as tuple has 3 elements
        impureTouch(a1);
    } else if (errorCode == EXIT_CELL_OVERFLOW || errorCode == EXIT_CELL_UNDERFLOW) {
        val msgCell = data.loadRef();
        var cs = msgCell.beginParse();
        
        // 9 exit code logic from original
        val number = cs.loadUint(2);
        
        // 8 exit code logic
        val recomp = beginCell()
            .storeUint(number, 2)
            .storeSlice(cs)
            .storeUint(2, 2) // overflow if > 1023 bits
            .endCell();
            
        contract.setData(recomp);
    } else if (errorCode == EXIT_DICTIONARY_ERROR) {
         // Original:
         // cell dict = new_dict();
         // dict~udict_set(16, 3, ...);
         // (cell value, int f) = dict.udict_get_ref?(16, 3);
         
         // Create empty dict and add a value with 2 refs
         // Then try to get it as single ref - this should fail with error 10
         var myDict: dict = createEmptyDict();
         val valCell = beginCell()
                .storeRef(beginCell().storeUint(123, 32).endCell())
                .storeRef(beginCell().storeUint(123, 33).endCell())
                .endCell();
         // udict_set(dict, key_len, key, value_slice)
         myDict.uDictSet(16, 3, valCell.beginParse());
         
         // uDictGetRef expects value to be exactly one reference, but we stored 2 refs
         val (res, found) = myDict.uDictGetRef(16, 3);
         impureTouchCellOpt(res);
    } else if (errorCode == EXIT_UNKNOWN_ERROR) { // 11
        sendMsg(beginCell().endCell(), 1);
    } else if (errorCode == EXIT_OUT_OF_GAS_ERROR) { // 13
        var i = 0;
        while (i < 100) {
            i += 1;
        }
        impureTouch(i);
    } else if (errorCode == EXIT_ACTION_LIST_INVALID) { // 32
        val actions = beginCell()
            .storeUint(0x0ec3c86d, 32)
            .storeUint(0, 8)
            .endCell();
        setC5(actions);
    } else if (errorCode == EXIT_ACTION_LIST_TOO_LONG) { // 33
        val msg = beginCell()
            .storeUint(0x18, 6)
            .storeAddress(contract.getAddress())
            .storeCoins(0)
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .endCell();
        repeat(256) {
            sendRawMessage(msg, mode);
        }
    } else if (errorCode == EXIT_ACTION_INVALID) { // 34
        val invalidMsg = beginCell().endCell();
        sendRawMessage(invalidMsg, mode);
    } else if (errorCode == EXIT_INVALID_SRC_ADDR) { // 35
        val msg = beginCell()
            .storeUint(6, 4) // 0110
            // source address must be zero or my address
            .storeAddress(address("EQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPrHF"))
            .storeAddress(contract.getAddress())
            .storeCoins(1000000000000) // 1000 TON
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .endCell();
        sendRawMessage(msg, mode);
    } else if (errorCode == EXIT_INVALID_DST_ADDR) { // 36
        val msg = beginCell()
            .storeUint(0x18, 6)
            .storeUint(3, 2) // 11 -> MsgAddressInt
            .storeUint(2, 8) // 1 -> workchain (not existing)
            .storeUint(0, 256) // data part
            .storeCoins(1000000000000) // 1000 TON
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .endCell();
        sendRawMessage(msg, mode);
    } else if (errorCode == EXIT_NOT_ENOUGH_TON) { // 37
        val msg = beginCell()
            .storeUint(0x18, 6)
            .storeAddress(contract.getAddress())
            .storeCoins(1000000000000) // 1000 TON
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .endCell();
        sendRawMessage(msg, mode);
    } else if (errorCode == EXIT_NOT_ENOUGH_EXTRA_CURRENCIES) { // 38
        var extraDict: dict = createEmptyDict();
        val extraData = beginCell()
            .storeUint(1, 5) // 5 bits for number of bytes, 1 = 8 bits
            .storeUint(1, 8) // 8 bits for the amount
            .endCell();
        extraDict.uDictSet(32, 1, extraData.beginParse());
        
        val msg = beginCell()
            .storeUint(0x18, 6)
            .storeAddress(contract.getAddress())
            .storeCoins(0)
            .storeUint(1, 1) // has extra currencies
            .storeRef(extraDict!)
            .storeUint(0, 4 + 4 + 64 + 32 + 1 + 1)
            .endCell();
        sendRawMessage(msg, 1); // Use mode 1 as in original FunC
    } else if (errorCode == EXIT_NOT_ENOUGH_FUNDS) { // 40
        var deepBody = beginCell().endCell();
        repeat(100) { // Reduced from 510 to avoid memory issues
            deepBody = beginCell().storeRef(deepBody).endCell();
        }
        val msg = beginCell()
            .storeUint(0x18, 6)
            .storeAddress(contract.getAddress())
            .storeCoins(1000)
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .storeRef(deepBody)
            .endCell();
        sendRawMessage(msg, mode);
    } else if (errorCode == EXIT_LIB_OUT_OF_LIMIT) { // 43
        // Create a library that exceeds the cell count limit (1000 cells per library)
        // Build a shallow but wide tree to stay under depth limit (512) but exceed cell count (1000)
        // Strategy: create chains of depth ~250, then combine 4 chains -> ~1004 cells total
        
        var chain1 = beginCell().storeUint(0, 32).endCell();
        repeat (250) {
            chain1 = beginCell().storeUint(1, 32).storeRef(chain1).endCell();
        }
        
        var chain2 = beginCell().storeUint(0, 32).endCell();
        repeat (250) {
            chain2 = beginCell().storeUint(2, 32).storeRef(chain2).endCell();
        }
        
        var chain3 = beginCell().storeUint(0, 32).endCell();
        repeat (250) {
            chain3 = beginCell().storeUint(3, 32).storeRef(chain3).endCell();
        }
        
        var chain4 = beginCell().storeUint(0, 32).endCell();
        repeat (250) {
            chain4 = beginCell().storeUint(4, 32).storeRef(chain4).endCell();
        }
        
        // Combine all chains into one library cell (depth = 251, cells = 1004)
        val lib = beginCell()
            .storeUint(0, 8)
            .storeRef(chain1)
            .storeRef(chain2)
            .storeRef(chain3)
            .storeRef(chain4)
            .endCell();
        
        // setLibCode will fail in action phase with error 43 when library exceeds limits
        setLibCode(lib, 1);
    } else {
        throw ERR_UNKNOWN_OP;
    }
}

fun onInternalMessage(in: InMessage) {
    if (in.body.isEmpty()) {
        return;
    }
    
    if (contract.getOriginalBalance() < MIN_BALANCE) {
        throw ERR_NOT_ENOUGH_BALANCE;
    }
    
    val msg = lazy AllowedMessage.fromSlice(in.body);
    
    match (msg) {
        SetFirst => {
            val rootId = Storage.load().id;
            val initCode = msg.initCode;
            val originalSender = in.senderAddress;
            
            // msg1 - Regular
            var deployMsg = createMessage({
                dest: buildFireworkAddress(rootId + 1, initCode),
                value: ONE_TON,
                bounce: true,
                body: LaunchFirst { originalSender: originalSender }
            });
            deployMsg.send(SEND_MODE_REGULAR);
            
            // msg2 - Mode 64
            deployMsg = createMessage({
                dest: buildFireworkAddress(rootId + 2, initCode),
                value: ONE_TON / 4,
                bounce: true,
                body: LaunchSecondMode64 { originalSender: originalSender }
            });
            deployMsg.send(SEND_MODE_REGULAR);
            
            // msg3 - Mode 65
            deployMsg = createMessage({
                dest: buildFireworkAddress(rootId + 3, initCode),
                value: ONE_TON / 4,
                bounce: true,
                body: LaunchSecondMode65 { originalSender: originalSender }
            });
            deployMsg.send(SEND_MODE_REGULAR);
            
            // msg4 - Mode 80
            deployMsg = createMessage({
                dest: buildFireworkAddress(rootId + 4, initCode),
                value: ONE_TON / 4,
                bounce: true,
                body: LaunchSecondMode80 { originalSender: originalSender }
            });
            deployMsg.send(SEND_MODE_REGULAR);
            
            // msg5 - Mode 81
            deployMsg = createMessage({
                dest: buildFireworkAddress(rootId + 5, initCode),
                value: ONE_TON / 4,
                bounce: true,
                body: LaunchSecondMode81 { originalSender: originalSender }
            });
            deployMsg.send(SEND_MODE_REGULAR);
            
            // msg6 - Mode 128
            deployMsg = createMessage({
                dest: buildFireworkAddress(rootId + 6, initCode),
                value: ONE_TON / 4,
                bounce: true,
                body: LaunchSecondMode128 { originalSender: originalSender }
            });
            deployMsg.send(SEND_MODE_REGULAR);
            
            // msg7 - Mode 144
            deployMsg = createMessage({
                dest: buildFireworkAddress(rootId + 7, initCode),
                value: ONE_TON / 4,
                bounce: true,
                body: LaunchSecondMode144 { originalSender: originalSender }
            });
            deployMsg.send(SEND_MODE_REGULAR);
        }
        
        LaunchFirst => {
            val dest = msg.originalSender;
            val coin = ONE_TON / 10;
            
            // msg1 - mode 0
            sendCommentMessage(coin, SEND_MODE_REGULAR, MSG_COMMENT_0, dest);
            
            // msg4 - mode 1
            sendCommentMessage(coin, SEND_MODE_PAY_FEES_SEPARATELY, MSG_COMMENT_1, dest);
            
            // msg2 - mode 2
            sendCommentMessage(coin, SEND_MODE_IGNORE_ERRORS, MSG_COMMENT_2, dest);
            
            // msg3 - mode 16
            sendCommentMessage(coin, SEND_MODE_BOUNCE_ON_ACTION_FAIL, MSG_COMMENT_16, dest);
            
            // msg5 - mode 17
            sendCommentMessage(coin, SEND_MODE_BOUNCE_ON_ACTION_FAIL | SEND_MODE_PAY_FEES_SEPARATELY, MSG_COMMENT_17, dest);
            
            // msgX - mode 160 (128 + 32) destroy
            sendCommentMessage(0, SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_DESTROY, MSG_COMMENT_160, dest);
        }
        
        LaunchSecondMode64 => {
            sendCommentMessage(0, SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE, MSG_COMMENT_64, msg.originalSender);
        }
        
        LaunchSecondMode65 => {
            sendCommentMessage(0, SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE | SEND_MODE_PAY_FEES_SEPARATELY, MSG_COMMENT_65, msg.originalSender);
        }
        
        LaunchSecondMode80 => {
            sendCommentMessage(0, SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE | SEND_MODE_BOUNCE_ON_ACTION_FAIL, MSG_COMMENT_80, msg.originalSender);
        }
        
        LaunchSecondMode81 => {
            sendCommentMessage(0, SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE | SEND_MODE_BOUNCE_ON_ACTION_FAIL | SEND_MODE_PAY_FEES_SEPARATELY, MSG_COMMENT_81, msg.originalSender);
        }
        
        LaunchSecondMode128 => {
            sendCommentMessage(0, SEND_MODE_CARRY_ALL_BALANCE, MSG_COMMENT_128, msg.originalSender);
        }
        
        LaunchSecondMode144 => {
            sendCommentMessage(0, SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_BOUNCE_ON_ACTION_FAIL, MSG_COMMENT_144, msg.originalSender);
        }
        
        FakedLaunch => {
            val errorCode = msg.errorCode as int;
            if (errorCode == 1) {
                returnAlt();
            }
            if (errorCode == 0) {
                return; // Success, no mode needed
            }
            // Mode is only for action phase errors (>= 32)
            // For compute phase, data comes directly after errorCode
            var restSlice: slice = msg.rest;
            var mode = 0;
            if (errorCode >= 32 && restSlice.remainingBitsCount() >= 8) {
                mode = restSlice.loadUint(8);
            }
            fakeLaunch(errorCode, mode, restSlice);
        }
        
        else => {
            throw ERR_UNKNOWN_OP;
        }
    }
}

fun onBouncedMessage(in: InMessageBounced) {
    // Previously ignored, now explicitly defined to do nothing or log
}

get fun get_id(): int32 {
    return Storage.load().id;
}
