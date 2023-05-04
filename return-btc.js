const bitcoinjs = require('bitcoinjs-lib');
const bitcoin = require("bitgo-utxo-lib");
const axios = require('axios');
const ecpair = require('ecpair');
const secp256k1 = require('tiny-secp256k1');

// Set your wif key
const wifKey = "";
const ECPair = ecpair.ECPairFactory(secp256k1);
const keyPair = ECPair.fromWIF(wifKey);

// Use bitgo-utxo-lib to get address
let BTC_ADDRESS = bitcoin.ECPair.fromWIF(wifKey).getAddress();

const processUtxos = async utxos => {
    let inputs = [];
    let hex_dict = {};
    for (const utxo of utxos) {
        // Get raw hex of tx from api, and store in dict to avoid multiple calls for same tx
        if (hex_dict[utxo.tx_hash_big_endian] == undefined) {
            console.log("Gettng raw hex for tx: " + utxo.tx_hash_big_endian)
            hex_dict[utxo.tx_hash_big_endian] = await axios.get(`https://blockchain.info/rawtx/${utxo.tx_hash_big_endian}?format=hex`);
        }
        // Add input to array
        inputs.push({
            txId: utxo.tx_hash_big_endian,
            vout: utxo.tx_output_n,
            satoshis: utxo.value,
            rawhex: hex_dict[utxo.tx_hash_big_endian].data
        });
        
    }
    // Create psbt object (https://thebitcoinmanual.com/articles/what-is-psbt/)
    const psbt = new bitcoinjs.Psbt();
    psbt.setVersion(2);
    psbt.setLocktime(0);
    // Add inputs to psbt object
    inputs.forEach((input) => {
        console.log("Adding input: " + input.txId + " vout " + input.vout);
        psbt.addInput({
            hash: input.txId,
            index: input.vout,
            sequence: 0xffffffff,
            // non-segwit inputs now require passing the raw hex of the previous tx as Buffer
            nonWitnessUtxo: Buffer.from(
                input.rawhex,
                'hex',
            )
        })
    });

    let fee = 1200*(utxos.length); // in satoshis. Tweak this according to current fee rate via https://buybitcoinworldwide.com/fee-calculator/ for <= 48 blocks
    const totalValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    // Add output to psbt object
    psbt.addOutput({
        address: '1E9eJhgXSskSw7DaiFGoeZWJ5XrnFUjgUR',
        value: totalValue - fee,
    });
    // Sign inputs
    inputs.forEach((input, index) => {
        console.log("signing input "+ index + " of " + inputs.length + " inputs");
        psbt.signInput(index, keyPair);
    });
    // Finalize inputs
    psbt.finalizeAllInputs();
    // Print signed transaction hex
    console.log(psbt.extractTransaction().toHex())
    console.log("Copy the above hex and decode it via https://live.blockcypher.com/btc/decodetx/");
    console.log("If it decodes and is correct, broadcast it via https://blockstream.info/tx/push");
}
  
async function consolidateUtxos() {
    try {
        // Get UTXOs from address
        const utxosResponse = await axios.get(`https://blockchain.info/unspent?active=${BTC_ADDRESS}`);
        let utxos = utxosResponse.data["unspent_outputs"];
        utxos = utxos.filter(utxo => utxo.confirmations > 6) //spend only confirmed utxos
        if (utxos.length === 0) {
            console.log(`No UTXOs found for address ${BTC_ADDRESS}`);
            return;
        }
        await processUtxos(utxos)
    } catch (error) {
        console.error('Error consolidating UTXOs:', error.message);
    }
}

consolidateUtxos();
