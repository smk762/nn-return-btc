const bitcoinjs = require('bitcoinjs-lib');
const bitcoin = require("bitgo-utxo-lib");
const axios = require('axios');
const ecpair = require('ecpair');
const secp256k1 = require('tiny-secp256k1');

const ECPair = ecpair.ECPairFactory(secp256k1);

// Set your wif key
const wifKey = "";
const keyPair = ECPair.fromWIF(wifKey);
const keyPair2 = bitcoin.ECPair.fromWIF(wifKey);
let BTC_ADDRESS = keyPair2.getAddress();

const processUtxos = async utxos => {
    let inputs = [];
    let hex_dict = {};
    for (const utxo of utxos) {
        if (hex_dict[utxo.tx_hash_big_endian] == undefined) {
            hex_dict[utxo.tx_hash_big_endian] = await axios.get(`https://blockchain.info/rawtx/${utxo.tx_hash_big_endian}?format=hex`);
        }
        inputs.push({
            txId: utxo.tx_hash_big_endian,
            vout: utxo.tx_output_n,
            satoshis: utxo.value,
            rawhex: hex_dict[utxo.tx_hash_big_endian].data
        });
        
    }
    const psbt = new bitcoinjs.Psbt();
    psbt.setVersion(2);
    psbt.setLocktime(0);
    inputs.forEach((input) => {
        console.log(input.rawhex);
        console.log(input.txId);
        console.log(input.vout);
        psbt.addInput({
            hash: input.txId,
            index: input.vout,
            sequence: 0xffffffff, 
            // non-segwit inputs require passing the whole previous tx as Buffer
            nonWitnessUtxo: Buffer.from(
                input.rawhex,
                'hex',
            )
        })
    });

    let fee = 800*(utxos.length); // in satoshis. Tweak this according to current fee rate via https://buybitcoinworldwide.com/fee-calculator/ for <= 48 blocks
    const totalValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    psbt.addOutput({
        address: '1E9eJhgXSskSw7DaiFGoeZWJ5XrnFUjgUR',
        value: totalValue - fee,
    });
    inputs.forEach((input, index) => {
        console.log("signing input");
        psbt.signInput(index, keyPair);
    });
    psbt.finalizeAllInputs();
    console.log(psbt.extractTransaction().toHex())
}
  
async function consolidateUtxos() {
    try {
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
