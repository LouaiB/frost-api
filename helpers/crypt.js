const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = 'nodejs-jwt-template-crypto-password';

module.exports = {

    encrypt(text) {
        let cipher = crypto.createCipher(algorithm, key);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    },
    
    decrypt(text) {
        let decipher = crypto.createDecipher(algorithm, key);
        let decrypted = decipher.update(text, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
