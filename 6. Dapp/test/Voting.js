const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const constants = require('@openzeppelin/test-helpers/src/constants');

const Voting = artifacts.require("Voting");

contract("Voting", (accounts) => {

    const owner = accounts[0];
    const voters1 = accounts[1];
    const voters2 = accounts[2];
    const proposition = "Proposition blah blah";

    beforeEach(async function () {
        this.votingInstance = await Voting.new({from: owner});
    });

    describe('Registering voters and preparing voting process', () => {

        it('Should register voters', async function () {
            const registeringVoter = await this.votingInstance.registerVoters(owner,{from: owner});
            await this.votingInstance.registerVoters(voters1,({from: owner}));
            const ownerVoting = await this.votingInstance.voters(owner);
            const voters1Voting = await this.votingInstance.voters(voters1);
            const voters2Voting = await this.votingInstance.voters(voters2);
            expectEvent(registeringVoter, 'VoterRegistered', {
                voterAddress: owner,
            });
            expect(ownerVoting.isRegistered).to.be.true;
            expect(voters1Voting.isRegistered).to.be.true;
            expect(voters2Voting.isRegistered).to.be.false;
        });
    
        it('Should start the proposals registration', async function () {
            const startProposalsRegistration =  await this.votingInstance.startProposalsRegistration({from: owner});
            //Quel est le meilleur choix pour enum, new BN ou toString() ?
            expectEvent(startProposalsRegistration, 'WorkflowStatusChange', {
                previousStatus: Voting.WorkflowStatus.RegisteringVoters.toString(), 
                newStatus: Voting.WorkflowStatus.ProposalsRegistrationStarted.toString()
            });
        });

        it('Should not be abble to start the proposals registration', async function () {
            //Pourquoi n'ais-je pas une exception "Unauthorized" ou "Ownable: caller is not the owner"
            //https://docs.openzeppelin.com/test-helpers/0.5/api#expect-revert
            // await expectRevert(
            //     this.votingInstance.startProposalsRegistration({from: voters1}),
            //     'Ownable: caller is not the owner'
            // );
            await expectRevert.unspecified(this.votingInstance.startProposalsRegistration({from: voters1}));
        });
    
        it('Should register a proposal', async function () {
            //Possibilité de mocker plutôt que d'appeler les fonctions ?
            await this.votingInstance.registerVoters(voters1,({from: owner}));
            await this.votingInstance.startProposalsRegistration({from: owner});
            const registeringProposal = await this.votingInstance.registerProposals(proposition, {from: voters1});
            const firstProposal = await this.votingInstance.proposals(0);
            expect(firstProposal.description).to.be.equal('Proposition blah blah');
            expectEvent(registeringProposal, 'ProposalRegistered', {
                proposalId: new BN(1),
            });
        });

        it('Should not be abble to register a proposal', async function () {
            await this.votingInstance.registerVoters(voters1,({from: owner}));
            await this.votingInstance.startProposalsRegistration({from: owner});
            await expectRevert.unspecified(this.votingInstance.registerProposals(proposition, {from: voters2}));
        });

        it('Should not be abble to register a proposal without a description', async function () {
            await this.votingInstance.registerVoters(voters1,({from: owner}));
            await this.votingInstance.startProposalsRegistration({from: owner});
            await expectRevert(this.votingInstance.registerProposals('', {from: voters1}), 'Description must be fullfilled');
        });
    
        it('Should end proposal registration', async function () {
            await this.votingInstance.registerVoters(voters1,({from: owner}));
            await this.votingInstance.startProposalsRegistration({from: owner});
            const endProposalsRegistration =  await this.votingInstance.endProposalsRegistration({from: owner});
            expectEvent(endProposalsRegistration, 'WorkflowStatusChange', {
                previousStatus: Voting.WorkflowStatus.ProposalsRegistrationStarted.toString(), 
                newStatus: Voting.WorkflowStatus.ProposalsRegistrationEnded.toString()
            });
        });

        it('Should start voting session', async function () {
            await this.votingInstance.registerVoters(voters1,({from: owner}));
            await this.votingInstance.startProposalsRegistration({from: owner});
            await this.votingInstance.endProposalsRegistration({from: owner});
            const startVotingSession = await this.votingInstance.startVotingSession({from: owner});
            expectEvent(startVotingSession, 'WorkflowStatusChange', {
                previousStatus: Voting.WorkflowStatus.ProposalsRegistrationEnded.toString(), 
                newStatus: Voting.WorkflowStatus.VotingSessionStarted.toString()
            });
        });    
    });

    describe('Testing voting process', () => {

        beforeEach(async function () {
            await this.votingInstance.registerVoters(owner,({from: owner}));
            await this.votingInstance.registerVoters(voters1,({from: owner}));
            await this.votingInstance.startProposalsRegistration({from: owner});
            await this.votingInstance.registerProposals(proposition, {from: owner});
            await this.votingInstance.registerProposals(proposition, {from: voters1});
            await this.votingInstance.endProposalsRegistration({from: owner});
            await this.votingInstance.startVotingSession({from: owner});
        });

        it('Should be a vote', async function () {
            const voted = await this.votingInstance.vote(0, {from: voters1});
            const firstProposal = await this.votingInstance.proposals(0);
            expect(firstProposal.voteCount).to.be.bignumber.equal(new BN(1));
            expectEvent(voted, 'Voted', {
                voter: voters1,
                proposalId: new BN(0)
            });
        });

        it('Should not be a vote', async function () {
            await this.votingInstance.vote(0, {from: voters1});
            await expectRevert(this.votingInstance.vote(0, {from: voters1}), 'You have already voted');
        });

        it('Should not be a vote as proposition does not exists', async function () {
            await expectRevert.unspecified(this.votingInstance.vote(18, {from: voters1}));
        });

        it('Should end voting session', async function () {
            const endVotingSession = await this.votingInstance.endVotingSession({from: owner});
            expectEvent(endVotingSession, 'WorkflowStatusChange', {
                previousStatus: Voting.WorkflowStatus.VotingSessionStarted.toString(), 
                newStatus: Voting.WorkflowStatus.VotingSessionEnded.toString()
            });
        });

        it('Should set voting status to tallied', async function () {
            await this.votingInstance.endVotingSession({from: owner});
            const votingTallied = await this.votingInstance.setStatusToTallied({from: owner});
            expectEvent(votingTallied, 'WorkflowStatusChange', {
                previousStatus: Voting.WorkflowStatus.VotingSessionEnded.toString(), 
                newStatus: Voting.WorkflowStatus.VotesTallied.toString()
            });
        });

        it('Should return the winner', async function () {
            await this.votingInstance.vote(0, {from: owner});
            await this.votingInstance.vote(0, {from: voters1});
            await this.votingInstance.endVotingSession({from: owner});
            await this.votingInstance.setStatusToTallied({from: owner});
            const winningProposal = await this.votingInstance.proposals(0);
            const winner = await this.votingInstance.getWinner({from: owner});
            expect(winner.voteCount).to.be.equal(winningProposal.voteCount.toString());
        });
    });
});
