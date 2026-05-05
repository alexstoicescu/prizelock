import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MockERC20, MockFeeOnTransferERC20, PrizeLockEscrow } from "../typechain-types";

describe("PrizeLockEscrow", function () {
  const Status = {
    Created: 0n,
    Funded: 1n,
    Awarded: 2n,
    Refunded: 3n,
  };

  const prizeAmount = ethers.parseUnits("1000", 18);
  const metadataURI = "ipfs://example-bounty-metadata";

  async function deployFixture() {
    const [sponsor, judge, winner, other] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("MockERC20");
    const token = (await tokenFactory.deploy()) as MockERC20;
    await token.waitForDeployment();

    const escrowFactory = await ethers.getContractFactory("PrizeLockEscrow");
    const escrow = (await escrowFactory.deploy()) as PrizeLockEscrow;
    await escrow.waitForDeployment();

    await token.mint(sponsor.address, prizeAmount);

    const deadline = (await time.latest()) + 7 * 24 * 60 * 60;

    return { sponsor, judge, winner, other, token, escrow, deadline };
  }

  async function createBountyFixture() {
    const context = await deployFixture();

    await context.escrow
      .connect(context.sponsor)
      .createBounty(
        await context.judge.getAddress(),
        await context.token.getAddress(),
        prizeAmount,
        context.deadline,
        metadataURI,
      );

    return { ...context, bountyId: 1n };
  }

  async function fundedBountyFixture() {
    const context = await createBountyFixture();

    await context.token.connect(context.sponsor).approve(await context.escrow.getAddress(), prizeAmount);
    await context.escrow.connect(context.sponsor).fundBounty(context.bountyId);

    return context;
  }

  async function feeTokenBountyFixture() {
    const [sponsor, judge] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("MockFeeOnTransferERC20");
    const token = (await tokenFactory.deploy()) as MockFeeOnTransferERC20;
    await token.waitForDeployment();

    const escrowFactory = await ethers.getContractFactory("PrizeLockEscrow");
    const escrow = (await escrowFactory.deploy()) as PrizeLockEscrow;
    await escrow.waitForDeployment();

    await token.mint(sponsor.address, prizeAmount);

    const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
    await escrow
      .connect(sponsor)
      .createBounty(judge.address, await token.getAddress(), prizeAmount, deadline, metadataURI);

    return { sponsor, token, escrow, bountyId: 1n };
  }

  it("creates a bounty", async function () {
    const { sponsor, judge, token, escrow, deadline } = await deployFixture();

    await expect(
      escrow.connect(sponsor).createBounty(judge.address, await token.getAddress(), prizeAmount, deadline, metadataURI),
    )
      .to.emit(escrow, "BountyCreated")
      .withArgs(1n, sponsor.address, judge.address, await token.getAddress(), prizeAmount, deadline, metadataURI);

    const bounty = await escrow.getBounty(1n);
    expect(bounty.sponsor).to.equal(sponsor.address);
    expect(bounty.judge).to.equal(judge.address);
    expect(bounty.token).to.equal(await token.getAddress());
    expect(bounty.amount).to.equal(prizeAmount);
    expect(bounty.deadline).to.equal(deadline);
    expect(bounty.winner).to.equal(ethers.ZeroAddress);
    expect(bounty.status).to.equal(Status.Created);
    expect(bounty.metadataURI).to.equal(metadataURI);
  });

  it("funds a bounty with MockERC20", async function () {
    const { sponsor, token, escrow, bountyId } = await createBountyFixture();

    await token.connect(sponsor).approve(await escrow.getAddress(), prizeAmount);

    await expect(escrow.connect(sponsor).fundBounty(bountyId))
      .to.emit(escrow, "BountyFunded")
      .withArgs(bountyId, sponsor.address, prizeAmount);

    expect(await token.balanceOf(await escrow.getAddress())).to.equal(prizeAmount);
    expect((await escrow.getBounty(bountyId)).status).to.equal(Status.Funded);
  });

  it("blocks non-sponsor funding", async function () {
    const { other, token, escrow, bountyId } = await createBountyFixture();

    await token.connect(other).approve(await escrow.getAddress(), prizeAmount);

    await expect(escrow.connect(other).fundBounty(bountyId)).to.be.revertedWith("Only sponsor can fund");
  });

  it("blocks fee-on-transfer tokens that underfund escrow", async function () {
    const { sponsor, token, escrow, bountyId } = await feeTokenBountyFixture();

    await token.connect(sponsor).approve(await escrow.getAddress(), prizeAmount);

    await expect(escrow.connect(sponsor).fundBounty(bountyId)).to.be.revertedWith("Incorrect token amount received");
  });

  it("awards a winner and transfers funds", async function () {
    const { judge, winner, token, escrow, bountyId } = await fundedBountyFixture();

    await expect(escrow.connect(judge).awardWinner(bountyId, winner.address))
      .to.emit(escrow, "BountyAwarded")
      .withArgs(bountyId, winner.address, prizeAmount);

    const bounty = await escrow.getBounty(bountyId);
    expect(bounty.winner).to.equal(winner.address);
    expect(bounty.status).to.equal(Status.Awarded);
    expect(await token.balanceOf(winner.address)).to.equal(prizeAmount);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n);
  });

  it("blocks non-judge winner selection", async function () {
    const { other, winner, escrow, bountyId } = await fundedBountyFixture();

    await expect(escrow.connect(other).awardWinner(bountyId, winner.address)).to.be.revertedWith(
      "Only judge can award",
    );
  });

  it("blocks payout before funding", async function () {
    const { judge, winner, escrow, bountyId } = await createBountyFixture();

    await expect(escrow.connect(judge).awardWinner(bountyId, winner.address)).to.be.revertedWith(
      "Bounty is not funded",
    );
  });

  it("blocks double payout", async function () {
    const { judge, winner, other, escrow, bountyId } = await fundedBountyFixture();

    await escrow.connect(judge).awardWinner(bountyId, winner.address);

    await expect(escrow.connect(judge).awardWinner(bountyId, other.address)).to.be.revertedWith("Bounty is not funded");
  });

  it("blocks zero-address winner", async function () {
    const { judge, escrow, bountyId } = await fundedBountyFixture();

    await expect(escrow.connect(judge).awardWinner(bountyId, ethers.ZeroAddress)).to.be.revertedWith(
      "Winner is zero address",
    );
  });

  it("refunds the sponsor after the deadline", async function () {
    const { sponsor, token, escrow, bountyId, deadline } = await fundedBountyFixture();

    await time.increaseTo(deadline + 1);

    await expect(escrow.connect(sponsor).refundSponsor(bountyId))
      .to.emit(escrow, "BountyRefunded")
      .withArgs(bountyId, sponsor.address, prizeAmount);

    expect((await escrow.getBounty(bountyId)).status).to.equal(Status.Refunded);
    expect(await token.balanceOf(sponsor.address)).to.equal(prizeAmount);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n);
  });

  it("blocks refund before the deadline", async function () {
    const { sponsor, escrow, bountyId } = await fundedBountyFixture();

    await expect(escrow.connect(sponsor).refundSponsor(bountyId)).to.be.revertedWith("Deadline not passed");
  });

  it("blocks non-sponsor refund", async function () {
    const { other, escrow, bountyId, deadline } = await fundedBountyFixture();

    await time.increaseTo(deadline + 1);

    await expect(escrow.connect(other).refundSponsor(bountyId)).to.be.revertedWith("Only sponsor can refund");
  });

  it("blocks refund after payout", async function () {
    const { sponsor, judge, winner, escrow, bountyId, deadline } = await fundedBountyFixture();

    await escrow.connect(judge).awardWinner(bountyId, winner.address);
    await time.increaseTo(deadline + 1);

    await expect(escrow.connect(sponsor).refundSponsor(bountyId)).to.be.revertedWith("Bounty is not funded");
  });
});
