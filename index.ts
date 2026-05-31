import { encrypt, decrypt } from "./src/utils/encryption"

let text = 'no puede ser verdad'

let x = encrypt(text)
console.log('og:');
console.log(x); console.log('---------------------');
let y = decrypt(x)
console.log('post:');
console.log(y);
