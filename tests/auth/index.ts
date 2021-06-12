process.env.NODE_ENV = "test";

import { PrismaClient } from "@prisma/client";

import server from "../../src/app";
//Require the dev-dependencies
import chai from "chai";
import chaiHttp from "chai-http";

const should = chai.should();
const prisma = new PrismaClient();

chai.use(chaiHttp);

describe("Users", () => {
  beforeEach((done) => {
    console.log("test");
  });
  /*
   * Test the /GET route
   */
  describe("/GET public key", () => {
    it("it should GET the public key", (done) => {
      chai
        .request(server)
        .get("/api/v1/pk")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a("object");
          res.body.length.should.be.eql(0);
          done();
        });
    });
  });
});
