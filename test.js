const nacl = require("tweetnacl")

const b58 = require("b58")

async function  test() {
    const kp = nacl.sign.keyPair()
    console.log(
        b58.encode(kp.secretKey)
    )
}
test()