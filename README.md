# How To

## install nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```

after the above script finishes successfully

```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

## install node-v16

```bash
nvm install v16
nvm use v16
```

## clone and cd into the repo

```bash
git clone https://github.com/gcharang/nn-return-btc && cd nn-return-btc
```

## install deps

```bash
npm ci
```

## run the script

Open the `return-btc.js` file and input your wif and desired fee

then, run the following command to get a hex and txid that will return the btc when broadcast

```bash
node return-btc.js
```

After decoding ( https://live.blockcypher.com/btc/decodetx/ ) the txn's hex and verifying that it is doing what it should, copy and paste the hex in the form at https://blockstream.info/tx/push and click on the "Broadcast transaction" button