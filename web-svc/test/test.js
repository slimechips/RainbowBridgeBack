/* eslint-disable quotes */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const chai = require('chai');
const server = require('../app');

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const chaiHttp = require('chai-http');

chai.should();

describe('web service API', () => {
  // Test get token
  describe('Get /auth/token', () => {
    it('It should give a token', (done) => {
      chai.request(server)
        .get('/auth/token')
        .end((err, response) => {
          response.should.have.status(200);
          response.body.length.should.be.eq(0);
          done();
        });
    });
  });

  // Test POST new support request
  describe('Get /user/newsupportreq', () => {
    it('It should create a new support req and get the client with an agent', (done) => {
      const support_req = {
        name: 'Alice',
        email: 'alice_one@gmail.com',
        reqId: 'alicereq',
        browserId: 'chrome',
        category: 'it',
      };
      chai.request(server)
        .get('/user/newsupportreq')
        .send(support_req)
        .end((err, response) => {
          response.should.have.status(200);
          response.body.should.have.property('agentId');
          done();
        });
    });
  });

  describe('Get /user/newsupportreq', () => {
    it('It should not get the client with an agent', (done) => {
      const support_req = {
        name: 'Bob',
        email: 'bob_one@gmail.com',
        reqId: 'bobreq',
        browserId: 'chrome',
        category: 'it',
      };
      chai.request(server)
        .get('/user/newsupportreq')
        .send(support_req)
        .end((err, response) => {
          response.should.have.status(400);
          // response.body.should.have.property('agentId');
          done();
        });
    });
  });
  // Test GET close request
  describe('Get /common/closereq', () => {
    it('It should close all the request', (done) => {
      chai.request(server)
        .get('/common/closereq')
        .end((err, response) => {
          response.should.have.status(200);
          response.should.have.property('success');
          response.should.have.property('success').eq(true);
          done();
        });
    });
  });
  // Test GET request status
  describe('Get /common/reqstatus', () => {
    it('It should get the support request with it status', (done) => {
      chai.request(server)
        .get('/common/reqstatus')
        .end((err, response) => {
          response.should.have.status(200);
          response.should.have.property('active');
          response.should.have.property('support_req');
          done();
        });
    });
  });
});
