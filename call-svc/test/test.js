/* eslint-disable no-undef */
import server from '../app';
/* eslint-disable @typescript-eslint/no-var-requires */
const chai = require('chai');
// const chaiHttp = require('chai-http');

chai.should();


describe('Call service API', () => {
  // Test get token
  describe('Get /auth/token', () => {
    it('It should give an empty token', (done) => {
      chai.request(server)
        .get('/auth/token')
        .end((err, response) => {
          response.should.have.status(200);
          response.body.length.should.be.eq(0);
          done();
        });
    });
  });

  // Test check valid token;
  describe('Get /auth/validate', () => {
    it('It should check whether an given token is valid', (done) => {
      chai.request(server)
        .get('/auth/validate')
        .end((err, response) => {
          response.should.have.status(200);
          response.body.length.should.be.eq(1);
          response.body.should.have.property('status');
          response.body.should.have.property('status').eq('OK');
          done();
        });
    });
  });

  // Test post
  describe('Post /user/newsupportreq', () => {
    // Post the first client's request
    it('It should get an client 1 with an agent', (done) => {
      const support_req = {
        name: 'client1',
        email: 'client_one@gmail.com',
        reqId: '01',
        browserId: 'chrome',
        category: 'sales',
      };
      chai.request(server)
        .get('/scheduler/reqagent')
        .send(support_req)
        .end((err, response) => {
          response.should.have.status(200);
          done();
        });
    });
    // Post the second client's requesting to the agent of type sales again
    it('It should get an client 2 with an agent', (done) => {
      const support_req = {
        name: 'client2',
        email: 'client_two@gmail.com',
        reqId: '02',
        browserId: 'chrome',
        category: 'sales',
      };
      chai.request(server)
        .get('/scheduler/reqagent')
        .send(support_req)
        .end((err, response) => {
          response.should.have.status(200);
          done();
        });
    });
    // Note there is only 2 available sales agents
    // Post the third client's requesting to the agent of type sales again
    it('It should not assign client 3 with an agent, but queue instead', (done) => {
      const support_req = {
        name: 'client3',
        email: 'client_three@gmail.com',
        reqId: '03',
        browserId: 'chrome',
        category: 'sales',
      };
      chai.request(server)
        .get('/scheduler/reqagent')
        .send(support_req)
        .end((err, response) => {
          response.should.have.status(404);
          response.body.should.have.property('error').eq('Still scheduling');
          done();
        });
    });
  });
  // Now we delete the last request
  describe('Get /scheduler/clearreqs', () => {
    it('It should give an empty token', (done) => {
      chai.request(server)
        .get('/scheduler/clearreqs')
        .end((err, response) => {
          response.should.have.status(200);
          response.body.length.should.be.eq(0);
          done();
        });
    });
  });

  // Test Get untag an agent to to simulate end one conversation
  describe('Get /scheduler/untagagent/:agentId', () => {
    it('It should give an empty token', (done) => {
      const agentId = '5e7a32e50beb4e6ae713daaf'; // Agent J
      // const agentId = '5e78cfb00beb4e6ae713d999'; //Agent Z
      chai.request(server)
        .get(`/scheduler/untagagent/${agentId}`)
        .end((err, response) => {
          response.should.have.status(200);
          response.body.length.should.be.eq(0);
          done();
        });
    });
  });

  // Now Post the third client's requesting to the agent of type sales again
  // It should assign the client with an agent
  it('It should assign client 3 with an agent', (done) => {
    const support_req = {
      name: 'client3',
      email: 'client_three@gmail.com',
      reqId: '03',
      browserId: 'chrome',
      category: 'sales',
    };
    chai.request(server)
      .get('/scheduler/reqagent')
      .send(support_req)
      .end((err, response) => {
        response.should.have.status(200);
        done();
      });
  });
});
