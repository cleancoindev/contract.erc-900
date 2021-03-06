import assertRevert from '../helpers/assertRevert'
import increaseTime from '../helpers/increaseTime'

const { BigNumber } = web3

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

export default function shouldBehaveLikeERC900CreditsStakeContract(accounts, lockInDuration) {

  describe('like a CreditsStakeContract', function () {
    const creator = accounts[0]
    const otherUser = accounts[1]
    const platform = accounts[9]

    beforeEach(async function () {
      await this.stakeContract.transferOwnership(platform)
    })

    describe('stake', function () {
      let balance

      beforeEach(async function () {
        await this.stakeContract.stake(web3.toWei(1, 'ether'), 0x0)
        balance = await this.stakeContract.creditBalanceOf(creator)
      })

      it('should issue credits when a stake is created', function () {
        balance.should.be.bignumber.equal(1)
      })

      it('should revert if less than 1 token is staked', async function () {
        await assertRevert(
          this.stakeContract.stake(web3.toWei(0.5, 'ether'), 0x0)
        )
      })

      it('should not remove credits when a stake is withdrawn', async function () {
        // Changing the timestamp of the next block so the stake is unlocked
        const tokenLockInDuration = await this.stakeContract.defaultLockInDuration()
        await increaseTime(tokenLockInDuration.toNumber())

        await this.stakeContract.unstake(web3.toWei(1, 'ether'), 0x0)

        const currentBalance = await this.stakeContract.creditBalanceOf(creator)
        currentBalance.should.be.bignumber.equal(balance)
      })
    })

    describe('stakeFor', function () {
      let balance

      beforeEach(async function () {
        await this.stakeContract.stakeFor(otherUser, web3.toWei(1, 'ether'), 0x0)
        balance = await this.stakeContract.creditBalanceOf(otherUser)
      })

      it('should issue credits to another user when a stake is created for them', function () {
        balance.should.be.bignumber.equal(1)
      })

      it('should revert if less than 1 token is staked', async function () {
        await assertRevert(
          this.stakeContract.stakeFor(otherUser, web3.toWei(0.5, 'ether'), 0x0)
        )
      })

      it('should not remove credits when a stake for another user is withdrawn', async function () {
        // Changing the timestamp of the next block so the stake is unlocked
        const tokenLockInDuration = await this.stakeContract.defaultLockInDuration()
        await increaseTime(tokenLockInDuration.toNumber())

        await this.stakeContract.unstake(web3.toWei(1, 'ether'), 0x0)

        const currentBalance = await this.stakeContract.creditBalanceOf(otherUser)
        currentBalance.should.be.bignumber.equal(balance)
      })
    })

    describe('stakeForDuration', function () {
      it('should issue exactly 1 credit if 1 token is staked for the default duration', async function () {
        await this.stakeContract.stakeForDuration(creator, web3.toWei(1, 'ether'), lockInDuration, 0x0)

        const balance = await this.stakeContract.creditBalanceOf(creator)
        balance.should.be.bignumber.equal(1)
      })

      it('should issue exactly 2 credits if 1 token is staked for 2x the default duration', async function () {
        await this.stakeContract.stakeForDuration(creator, web3.toWei(1, 'ether'), lockInDuration * 2, 0x0)

        const balance = await this.stakeContract.creditBalanceOf(creator)
        balance.should.be.bignumber.equal(2)
      })

      it('should only ever issue integer values for credits', async function () {
        await this.stakeContract.stakeForDuration(creator, web3.toWei(33.7818237129837, 'ether'), lockInDuration * 2, 0x0)

        const balance = await this.stakeContract.creditBalanceOf(creator)
        balance.should.be.bignumber.equal(67)
      })

      it('should revert if the duration specified is less than the default', async function () {
        await assertRevert(
          this.stakeContract.stakeForDuration(creator, web3.toWei(1, 'ether'), lockInDuration / 2, 0x0)
        )
      })

      it('should revert if less than 1 token is staked', async function () {
        await assertRevert(
          this.stakeContract.stakeForDuration(creator, web3.toWei(0.5, 'ether'), lockInDuration, 0x0)
        )
      })
    })

    describe('creditBalanceOf', function () {
      it('should be 0 by default', async function () {
        const balance = await this.stakeContract.creditBalanceOf(creator)
        balance.should.be.bignumber.equal(0)
      })

      it('should increase when stakes are made', async function () {
        await this.stakeContract.stake(web3.toWei(1, 'ether'), 0x0)

        const balance = await this.stakeContract.creditBalanceOf(creator)
        balance.should.be.bignumber.equal(1)
      })

      it('should decrease when credits are spent', async function () {
        await this.stakeContract.stake(web3.toWei(1, 'ether'), 0x0)
        await this.stakeContract.spendCredits(creator, 1, { from: platform })

        const newBalance = await this.stakeContract.creditBalanceOf(creator)
        newBalance.should.be.bignumber.equal(0)
      })
    })

    describe('spendCredits', function () {
      let originalBalance

      beforeEach(async function () {
        await this.stakeContract.stake(web3.toWei(1, 'ether'), 0x0)
        originalBalance = await this.stakeContract.creditBalanceOf(creator)
      })

      it('should decrease the number of credits in a user\'s balance', async function () {
        await this.stakeContract.spendCredits(creator, 1, { from: platform })

        const newBalance = await this.stakeContract.creditBalanceOf(creator)
        newBalance.should.be.bignumber.equal(0)
      })

      it('should revert if not called by the owner', async function () {
        await assertRevert(
          this.stakeContract.spendCredits(creator, 1)
        )
      })

      it('should revert if a user has insufficient credits', async function () {
        await assertRevert(
          this.stakeContract.spendCredits(creator, originalBalance * 2, { from: platform })
        )
      })
    })
  })
}

