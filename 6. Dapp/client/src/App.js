import React, { Component } from "react";
import VotingContract from "./contracts/Voting.json";
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  state = { web3: null, accounts: null, contract: null, winningProposal: null, votersByAddress: null, proposals: null };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();

      const deployedNetwork = VotingContract.networks[networkId];
      const instance = new web3.eth.Contract(
        VotingContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance, winningProposal: null }, this.runInit);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  runInit = async () => {
    const { accounts, contract } = this.state;

    // Get the allowed to vote account list
    const votersByAddress = await contract.methods.getVotersAddresses().call({from: accounts[0]});
    const proposals = await contract.methods.getProposals().call();
    console.log(proposals);
    // Update state
    this.setState({ votersByAddress: votersByAddress, proposals: proposals });
  };

  registerVoters = async () => {
    const { accounts, contract } = this.state;
    const voter = this.voter.value;
    await contract.methods.registerVoters(voter).send({ from: accounts[0] });
    this.runInit();
  }

  startProposalsRegistration = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.startProposalsRegistration().send({from: accounts[0]});
  }

  registerProposals = async () => {
    const { accounts, contract } = this.state;
    const description = this.proposalDescription.value;
    await contract.methods.registerProposals(description).send({from: accounts[0]});
    this.runInit();
  }

  endProposalsRegistration = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.endProposalsRegistration().send({from: accounts[0]});
  }

  startVotingSession = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.startVotingSession().send({from: accounts[0]});
  }

  vote = async (event) => {
    const { accounts, contract } = this.state;
    const proposalId = event.target.id !== "" ? event.target.id : this.proposalId.value;
    console.log(proposalId);
    await contract.methods.vote(proposalId).send({from: accounts[0]});
  }

  endVotingSession = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.endVotingSession().send({from: accounts[0]});
  }

  setStatusToTallied = async () => {
    const { accounts, contract } = this.state;
    await contract.methods.setStatusToTallied().send({from: accounts[0]});
  }

  getWinner = async () => {
    const { accounts, contract, winningProposal } = this.state;
    
    try {
      winningProposal = await contract.methods.getWinner().call({from: accounts[0]});
      this.setState({
        winningProposal : winningProposal
      });
    } catch (err) {
      let errJson = err.toString();
      if (errJson.indexOf('Internal JSON-RPC error.') > -1) {
        errJson = errJson.replace('\n', '').replace("Error: ", '').replace('Internal JSON-RPC error.', '')
        errJson = JSON.parse(errJson)
       }
      const txHash = Object.keys(errJson.data)[0];
      const reason = errJson.data[txHash].reason;
      this.setState({
        err : reason
      });
    }
    
  }


  render() {
    const { winningProposal, votersByAddress, proposals } = this.state;
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <div>
            <h2 className="text-center">Système de vote avec liste d'utilisateurs autorisés et propositions</h2>
            <hr></hr>
            <br></br>
        </div>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Liste des votants autorisés</strong></Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>@</th>
                      </tr>
                    </thead>
                    <tbody>
                      {votersByAddress !== null && 
                        votersByAddress.map((voterAccount) => <tr key={voterAccount}><td>{voterAccount}</td></tr>)
                      }
                    </tbody>
                  </Table>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Autoriser un nouveau votant</strong></Card.Header>
            <Card.Body>
              <Form.Group controlId="formVoter">
                <Form.Control type="text"
                ref={(input) => { this.voter = input }}
                />
              </Form.Group>
              <Button onClick={ this.registerVoters } variant="dark" > Autoriser </Button>
            </Card.Body>
          </Card>
        </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Déclencher la session d'enregistrement des propositions</strong></Card.Header>
            <Card.Body>
              <Button onClick={ this.startProposalsRegistration } variant="dark" > Démarrer session propositions </Button>
            </Card.Body>
          </Card>
        </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Enregistrer une proposition à soumettre au vote</strong></Card.Header>
            <Card.Body>
              <Form.Group controlId="formProposal">
                  <Form.Control type="text"
                  ref={(input) => { this.proposalDescription = input }}
                  />
              </Form.Group>
              <Button onClick={ this.registerProposals } variant="dark" > Enregister </Button>
            </Card.Body>
          </Card>
        </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Liste des propositions</strong></Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>@</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposals !== null && 
                        proposals.map((proposal, key) => 
                        <tr key={key}>
                          <td>{proposal.description}</td>
                          <td><button id={key} onClick={ this.vote }>Voter pour cette proposition</button></td>
                        </tr>)
                      }
                    </tbody>
                  </Table>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </div>
        <br></br> 
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Déclencher la fin de la session d'enregistrement des propositions</strong></Card.Header>
            <Card.Body>
              <Button onClick={ this.endProposalsRegistration } variant="dark" > Fin session propositions </Button>
            </Card.Body>
          </Card>
        </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Déclencher la session de vote</strong></Card.Header>
            <Card.Body>
              <Button onClick={ this.startVotingSession } variant="dark" > Démarrer les votes </Button>
            </Card.Body>
          </Card>
        </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Voter pour une proposition</strong></Card.Header>
            <Card.Body>
              <Form.Group controlId="formVotingProposal">
                  <Form.Control type="text"
                  ref={(input) => { this.proposalId = input }}
                  />
              </Form.Group>
              <Button onClick={ this.vote } variant="dark" > Voter </Button>
            </Card.Body>
          </Card>
        </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Déclencher la fin de la session de vote</strong></Card.Header>
            <Card.Body>
              <Button onClick={ this.endVotingSession } variant="dark" > Fin session de vote </Button>
            </Card.Body>
          </Card>
        </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Déclencher le fait que les votes sont comptabilisés pour afficher la proposition gagnante</strong></Card.Header>
            <Card.Body>
              <Button onClick={ this.setStatusToTallied } variant="dark" > Comptabilisation des votes </Button>
            </Card.Body>
          </Card>
        </div>
        <br></br>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Affiche la proposition gagnante</strong></Card.Header>
            <Card.Body>
              <Button onClick={ this.getWinner } variant="dark" > Afficher la proposition gagnante </Button>
              {this.state.err && <h2>{this.state.err}</h2>}
              {this.state.winningProposal !== null && (
                <blockquote className="blockquote mb-0">
                  <p id="winningProposalDescription">
                    {' '}
                    {this.state.winningProposal.description}
                    {' '}
                  </p>
                  
                    <footer className="blockquote-footer">
                      <p>Avec un total de</p> 
                      <cite title="Source Title" className="testage" id="winningProposalVotecount">
                        {this.state.winningProposal.voteCount} vote{this.state.winningProposal.voteCount > 1 && ('s')}
                      </cite>
                    </footer>
                </blockquote>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }
}

export default App;
