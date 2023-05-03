const bitcoin = require("bitgo-utxo-lib");
const axios = require('axios');

// Set your wif key
const wifKey = "";

let keyPair = bitcoin.ECPair.fromWIF(wifKey);
let BTC_ADDRESS = keyPair.getAddress();

const processUtxos = async utxos => {
    let inputs = [];

    for (const utxo of utxos) {
        inputs.push({
            txId: utxo.tx_hash_big_endian,
            vout: utxo.tx_output_n,
            satoshis: utxo.value
        });
    }
    let fee = 1000*(utxos.length); // in satoshis. Tweak this according to current fee rate via https://buybitcoinworldwide.com/fee-calculator/ for <= 48 blocks
    let txb = new bitcoin.TransactionBuilder();   

    inputs.forEach((input) => txb.addInput(
        input.txId,
        input.vout,
        0xffffffff - 1
    ));
    const totalValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    txb.addOutput("1E9eJhgXSskSw7DaiFGoeZWJ5XrnFUjgUR", totalValue - fee); //sending back `all - txnFee`
    inputs.forEach((input, index) => {
        txb.sign(index, keyPair);
    });

    let tx = txb.build();
    const hex = tx.toHex()
    console.log("txid: " + tx.getId());
    console.log("hex: " + hex);
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
