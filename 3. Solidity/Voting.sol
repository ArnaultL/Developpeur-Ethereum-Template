// Voting.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";

contract Voting is Ownable {

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

    WorkflowStatus public workflowStatus;
    uint private winningProposalId;

    mapping(address => Voter) private voters;

    Proposal[] public proposals;

    modifier flowStatus(WorkflowStatus _status) {
        //Comment préciser l'erreur avec une variable dans le champs texte ?
        require(workflowStatus == _status, "You are not able to do this action right now");
        _;
    }

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);

    constructor() {
        workflowStatus = WorkflowStatus.RegisteringVoters;
    }

    //Dans quel(s) cas utiliser modifier plutôt que require() ? Mis à part la duplication de code, quelle est la plus value ?
    function registerVoters(address _voterAddress) public flowStatus(WorkflowStatus.RegisteringVoters) onlyOwner {
        require(!voters[_voterAddress].isRegistered, "This address is already in voters");
        Voter memory voter;
        voter.isRegistered = true;
        voter.hasVoted = false;
        voters[_voterAddress] = voter;
        emit VoterRegistered(_voterAddress);
    }

    function startProposalsRegistration() public flowStatus(WorkflowStatus.RegisteringVoters) onlyOwner {
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    function registerProposals(Proposal memory proposal) public flowStatus(WorkflowStatus.ProposalsRegistrationStarted) {
        require(voters[msg.sender].isRegistered, "You are not allowed to make a proposal");
        require(voters[msg.sender].votedProposalId == 0, "You have already made a proposal");
        //Je suppose que dans ce cas, le mieux serait de passer un "string description" en params et de setter un objet memory proposal dans la fonction ?
        require(proposal.voteCount == 0, "You are not allowed, for obvious reasons, to fill the voteCount");
        proposals.push(proposal);
        voters[msg.sender].votedProposalId = proposals.length + 1;
    }
   
    function endProposalsRegistration() public flowStatus(WorkflowStatus.ProposalsRegistrationStarted) onlyOwner {
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    function startVotingSession() public flowStatus(WorkflowStatus.ProposalsRegistrationEnded) onlyOwner {
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    function vote(uint proposalId) public flowStatus(WorkflowStatus.VotingSessionStarted) {
        require(voters[msg.sender].isRegistered, "You are not allowed to vote");
        require(!voters[msg.sender].hasVoted, "You have already voted");
        proposals[proposalId].voteCount += 1;
        voters[msg.sender].hasVoted = true;
        emit Voted(msg.sender, proposalId);
    }

    function endVotingSession() public flowStatus(WorkflowStatus.VotingSessionStarted) onlyOwner {
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    function computeWinningProposal() public flowStatus(WorkflowStatus.VotingSessionEnded) onlyOwner { //TODO, faire un tableau pour gérer les égalités
        uint winningVoteCount = 0;
        for (uint p = 0; p <proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposalId = p;
            }
        }
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }

    function getWinner() public flowStatus(WorkflowStatus.VotesTallied) view returns (Proposal memory) {
        return proposals[winningProposalId];
    }
}
