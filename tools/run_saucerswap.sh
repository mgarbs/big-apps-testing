

rm -rf ./artifacts ./cache ./node_modules ./typechain-types

npm install

npm install --save-dev hardhat

npx hardhat compile

npm run compile

npx hardhat run scripts/deploy/assets.ts --network hederaLocalnet
VERSION=v1 npx hardhat run scripts/deploy/saucerswap.ts --network hederaLocalnet
# VERSION=v2 npx hardhat run scripts/deploy/saucerswap.ts --network hederaLocalnet
# npx hardhat run scripts/deploy/full.ts --network hederaLocalnet

npx hardhat test --network hederaLocalnet
npx hardhat test test/saucerswap/factory.test.ts --network hederaLocalnet
npx hardhat test test/assets/whbar.test.ts --network hederaLocalnet


