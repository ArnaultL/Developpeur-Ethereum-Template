// Voting.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting is Ownable {
    // state variables
    WorkflowStatus public workflowStatus;
    uint private winningProposalId;
    uint private winningVoteCount;
    uint private proposalCount;
    // events
    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);
    // function modifiers
    modifier flowStatus(WorkflowStatus _status) {
        require(workflowStatus == _status, "You are not able to do this action right now");
        _;
    }
    // struct, arrays, mapping or enums
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }
    struct Proposal {
        string description;
        uint voteCount;
    }
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }
    mapping(address => Voter) public voters;
    address[] public votersAddresses;
    Proposal[] public proposals;

    function registerVoters(address _voterAddress) public flowStatus(WorkflowStatus.RegisteringVoters) onlyOwner {
        require(!voters[_voterAddress].isRegistered, "This address is already in voters");
        voters[_voterAddress] = Voter({isRegistered: true, hasVoted: false, votedProposalId: 0});
        votersAddresses.push(_voterAddress);
        emit VoterRegistered(_voterAddress);
    }

    function getVotersAddresses() public view returns(address[] memory) {
        return votersAddresses;
    }

    function startProposalsRegistration() public flowStatus(WorkflowStatus.RegisteringVoters) onlyOwner {
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    function registerProposals(string memory _description) public flowStatus(WorkflowStatus.ProposalsRegistrationStarted) {
        require(voters[msg.sender].isRegistered, "You are not allowed to make a proposal");
        require(bytes(_description).length > 0, "Description must be fullfilled");
        proposals.push(Proposal({description: _description, voteCount: 0}));
        proposalCount += 1;
        emit ProposalRegistered(proposals.length);
    }

    function getProposals() public view returns (Proposal[] memory) {
        return proposals;
    }
   
    function endProposalsRegistration() public flowStatus(WorkflowStatus.ProposalsRegistrationStarted) onlyOwner {
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    function startVotingSession() public flowStatus(WorkflowStatus.ProposalsRegistrationEnded) onlyOwner {
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    function vote(uint _proposalId) public flowStatus(WorkflowStatus.VotingSessionStarted) {
        require(voters[msg.sender].isRegistered, "You are not allowed to vote");
        require(!voters[msg.sender].hasVoted, "You have already voted");
        require(bytes(proposals[_proposalId].description).length > 0, "This proposition does exists");
        voters[msg.sender].votedProposalId = _proposalId;
        voters[msg.sender].hasVoted = true;
        proposals[_proposalId].voteCount += 1;
        if (proposals[_proposalId].voteCount > winningVoteCount) {
            winningVoteCount = proposals[_proposalId].voteCount;
            winningProposalId = _proposalId;
        }
        emit Voted(msg.sender, _proposalId);
    }

    function endVotingSession() public flowStatus(WorkflowStatus.VotingSessionStarted) onlyOwner {
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    function setStatusToTallied() public flowStatus(WorkflowStatus.VotingSessionEnded) onlyOwner {
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }

    function getWinner() public flowStatus(WorkflowStatus.VotesTallied) view returns (Proposal memory) {
        return proposals[winningProposalId];
    }
}
