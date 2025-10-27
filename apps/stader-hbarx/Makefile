
.PHONY: deploy clean

deploy: hbarxToken.address rewardsContract.address stakingContract.address

hbarxToken.address:
	./hbarx.js > $@
	@echo "Deployed HBARX Token at address `cat hbarxToken.address`"

rewardsContract.address:
	source .env && cast send --private-key $$PRIVATE_KEY --rpc-url http://localhost:7546 --value 10000000000000000000 --create `./yulc.js rewardsContract.yul` --json | jq .contractAddress --raw-output > rewardsContract.address

stakingContract.address: stakingContract.yul
	source .env && cast send --private-key $$PRIVATE_KEY --rpc-url http://localhost:7546 --create `./yulc.js stakingContract.yul` --json | jq .contractAddress --raw-output > stakingContract.address
	@echo "Deploy Staking Contract at address `cat stakingContract.address`"
	./setup-hbarx-token.js

stakingContract.yul: hbarxToken.address rewardsContract.address
	cat stakingContract.template.yul | HBARX_TOKEN_ADDRESS=`cat hbarxToken.address` REWARDS_CONTRACT_ADDRESS=`cat rewardsContract.address` envsubst > $@

clean:
	-rm *.address stakingContract.yul
