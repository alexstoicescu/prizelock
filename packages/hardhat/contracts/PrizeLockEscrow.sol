// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Minimal escrow for one-winner hackathon bounties paid in ERC20 tokens.
contract PrizeLockEscrow {
    using SafeERC20 for IERC20;

    enum Status {
        Created,
        Funded,
        Awarded,
        Refunded
    }

    struct Bounty {
        address sponsor;
        address judge;
        address token;
        uint256 amount;
        uint256 deadline;
        address winner;
        Status status;
        string metadataURI;
    }

    uint256 public nextBountyId = 1;
    mapping(uint256 bountyId => Bounty) private bounties;

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed sponsor,
        address indexed judge,
        address token,
        uint256 amount,
        uint256 deadline,
        string metadataURI
    );
    event BountyFunded(uint256 indexed bountyId, address indexed sponsor, uint256 amount);
    event BountyAwarded(uint256 indexed bountyId, address indexed winner, uint256 amount);
    event BountyRefunded(uint256 indexed bountyId, address indexed sponsor, uint256 amount);

    function createBounty(
        address judge,
        address token,
        uint256 amount,
        uint256 deadline,
        string calldata metadataURI
    ) external returns (uint256 bountyId) {
        require(judge != address(0), "Judge is zero address");
        require(token != address(0), "Token is zero address");
        require(amount > 0, "Amount is zero");
        require(deadline > block.timestamp, "Deadline must be future");

        bountyId = nextBountyId;
        nextBountyId += 1;

        bounties[bountyId] = Bounty({
            sponsor: msg.sender,
            judge: judge,
            token: token,
            amount: amount,
            deadline: deadline,
            winner: address(0),
            status: Status.Created,
            metadataURI: metadataURI
        });

        emit BountyCreated(bountyId, msg.sender, judge, token, amount, deadline, metadataURI);
    }

    function fundBounty(uint256 bountyId) external {
        Bounty storage bounty = bounties[bountyId];

        require(bounty.sponsor != address(0), "Bounty does not exist");
        require(msg.sender == bounty.sponsor, "Only sponsor can fund");
        require(bounty.status == Status.Created, "Bounty is not created");

        uint256 balanceBefore = IERC20(bounty.token).balanceOf(address(this));

        bounty.status = Status.Funded;

        // The sponsor must approve this escrow contract before calling fundBounty.
        IERC20(bounty.token).safeTransferFrom(msg.sender, address(this), bounty.amount);
        require(IERC20(bounty.token).balanceOf(address(this)) - balanceBefore == bounty.amount, "Incorrect token amount received");

        emit BountyFunded(bountyId, msg.sender, bounty.amount);
    }

    function awardWinner(uint256 bountyId, address winner) external {
        Bounty storage bounty = bounties[bountyId];

        require(bounty.sponsor != address(0), "Bounty does not exist");
        require(msg.sender == bounty.judge, "Only judge can award");
        require(winner != address(0), "Winner is zero address");
        require(bounty.status == Status.Funded, "Bounty is not funded");

        bounty.winner = winner;
        bounty.status = Status.Awarded;

        IERC20(bounty.token).safeTransfer(winner, bounty.amount);

        emit BountyAwarded(bountyId, winner, bounty.amount);
    }

    function refundSponsor(uint256 bountyId) external {
        Bounty storage bounty = bounties[bountyId];

        require(bounty.sponsor != address(0), "Bounty does not exist");
        require(msg.sender == bounty.sponsor, "Only sponsor can refund");
        require(bounty.status == Status.Funded, "Bounty is not funded");
        require(block.timestamp > bounty.deadline, "Deadline not passed");

        bounty.status = Status.Refunded;

        IERC20(bounty.token).safeTransfer(bounty.sponsor, bounty.amount);

        emit BountyRefunded(bountyId, bounty.sponsor, bounty.amount);
    }

    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        require(bounties[bountyId].sponsor != address(0), "Bounty does not exist");
        return bounties[bountyId];
    }
}
