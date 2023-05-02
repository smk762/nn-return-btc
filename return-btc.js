const bitcoin = require("bitgo-utxo-lib");
const axios = require('axios');

// Set your wif key and fees
const wifKey = "";
const fee = 10000; //in satoshis

let keyPair = bitcoin.ECPair.fromWIF(wifKey);
let BTC_ADDRESS = keyPair.getAddress();

const processUtxos = async utxos => {
    let inputs = [];

    for (const utxo of utxos) {
        inputs.push({
            txId: utxo.txid,
            vout: utxo.vout,
            satoshis: utxo.value
        });
    }

    let txb = new bitcoin.TransactionBuilder();   

    inputs.forEach((input) => txb.addInput(
        input.txId,
        input.vout,
        0xffffffff - 1
    ));
    const totalValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    txb.addOutput("1E9eJhgXSskSw7DaiFGoeZWJ5XrnFUjgUR", totalValue - fee); //sending back `all - txnFee`
    inputs.forEach((input, index) => {
        txb.sign(index, keyPair, "", bitcoin.Transaction.SIGHASH_ALL, input.satoshis);
    });

    let tx = txb.build();
    const hex = tx.toHex()
    console.log("txid: " + tx.getId());
    console.log("hex: " + hex);
}

async function consolidateUtxos() {
    try {
        const utxosResponse = await axios.get(`https://blockstream.info/api/address/${BTC_ADDRESS}/utxo`);
        let utxos = utxosResponse.data;
        utxos = utxos.filter(utxo => utxo.status.confirmed === true) //spend only confirmed utxos
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