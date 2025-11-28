tolk 1.2

struct (0x5720cfeb) SetFirst {
    initCode: cell
}

// Original sender address (destination for replies)
struct (0x6efe144b) LaunchFirst {
    originalSender: address
}

struct (0x00000040) LaunchSecondMode64 {
    originalSender: address
}

struct (0x00000041) LaunchSecondMode65 {
    originalSender: address
}

struct (0x00000050) LaunchSecondMode80 {
    originalSender: address
}

struct (0x00000051) LaunchSecondMode81 {
    originalSender: address
}

struct (0x00000080) LaunchSecondMode128 {
    originalSender: address
}

struct (0x00000090) LaunchSecondMode144 {
    originalSender: address
}

// FakedLaunch: errorCode is required, mode and data are parsed manually
// because for errorCode==0 we don't need to read mode
struct (0x39041457) FakedLaunch {
    errorCode: uint8
    rest: RemainingBitsAndRefs // mode (uint8) + remaining data
}

struct (0x00000000) CommentMessage {
    comment: slice
}

// Messages that can be received by this contract
type AllowedMessage =
    | SetFirst
    | LaunchFirst
    | LaunchSecondMode64
    | LaunchSecondMode65
    | LaunchSecondMode80
    | LaunchSecondMode81
    | LaunchSecondMode128
    | LaunchSecondMode144
    | FakedLaunch

