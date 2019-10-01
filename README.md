# Remittance Project

Remittance aplication for ethereum - Project 2 - Ethereum Developer Course - B9lab Academy

## What:

There are three people: Alice, Bob & Carol.
Alice wants to send funds to Bob, but she only has ether & Bob does not care about Ethereum and wants to be paid in local currency.
Luckily, Carol runs an exchange shop that converts ether to local currency.
Therefore, to get the funds to Bob, Alice will allow the funds to be transferred through Carol's exchange shop. Carol will collect the ether from Alice and give the local currency to Bob.

## The steps involved in the operation are as follows:

Alice creates a Remittance contract with Ether in it and a puzzle.
Alice sends a one-time-password to Bob; over SMS, say.
Alice sends another one-time-password to Carol; over email, say.
Bob treks to Carol's shop.
Bob gives Carol his one-time-password.
Carol submits both passwords to Alice's remittance contract.
Only when both passwords are correct does the contract yield the Ether to Carol.
Carol gives the local currency to Bob.
Bob leaves.
Alice is notified that the transaction went through.
Since they each have only half of the puzzle, Bob & Carol need to meet in person so they can supply both passwords to the contract. This is a security measure. It may help to understand this use-case as similar to a 2-factor authentication.

## Installation

Install [Truffle](https://trufflesuite.com)

Install [MetaMask](https://metamask.io)

Install [ganache](https://github.com/trufflesuite/ganache) running on 127.0.0.1:7545 
or [geth](https://geth.ethereum.org/) to have blockchain access.

Clone or download the repo and use npm to install the required dependencies (jquery, truffle-contract, web3, webpack, webpack-cli, webpack-dev-server, copy-webpack-plugin).

```bash
npm install
```

## Compile and migrate the contracts

```bash
truffle compile
truffle migrate
```

## Usage from webpack-dev-server

In the app file:

```bash
npm run dev
```

## Build with webpack for production

In the app file:

```bash
npm run build
```

## Test

```bash
truffle test
```

## Contributing
Pull requests are welcome. Be free to discuss what you would like to change.

## License
[Apache-2.0](https://choosealicense.com/licenses/apache-2.0/)