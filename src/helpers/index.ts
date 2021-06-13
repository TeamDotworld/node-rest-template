import { Twilio } from "twilio";
import { RoomInstance } from "twilio/lib/rest/video/v1/room";
import { Container } from "typedi";
import multer from "multer";
import jwt from "jsonwebtoken";

import crypto from "crypto";
import base64url from "base64url";
import cbor from "cbor";
const uuid = require("uuid-parse");
const jwkToPem = require("jwk-to-pem");

import config from "../config";
import AccessToken from "twilio/lib/jwt/AccessToken";
import { User } from "@prisma/client";
import { TokenPayload } from "../interface/User";

const VideoGrant = AccessToken.VideoGrant;

const makeid = (length: number): string => {
  let result: string[] = [];
  const characters: string =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result.push(
      characters.charAt(Math.floor(Math.random() * charactersLength))
    );
  }
  return result.join("");
};

const createRoom = async (name: string): Promise<RoomInstance> => {
  let twilio: Twilio = Container.get("twilio");
  let room = twilio.video.rooms.create({
    uniqueName: name,
    type: "peer-to-peer",
  });

  return room;
};

const createToken = async (
  room_id: string,
  identity: string
): Promise<string> => {
  const token: AccessToken = new AccessToken(
    config.twilio.account_sid,
    config.twilio.api_key,
    config.twilio.api_secret
  );

  token.identity = identity;

  const videoGrant = new VideoGrant({
    room: room_id,
  });

  token.addGrant(videoGrant);

  return token.toJwt();
};

const closeRoom = async (roomName: string): Promise<RoomInstance> => {
  let twilio: Twilio = Container.get("twilio");
  let room = twilio.video.rooms(roomName).update({ status: "completed" });
  return room;
};

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, "uploads/");
  },
  filename: function (_req, file, cb) {
    console.log(file);
    cb(null, file.originalname);
  },
});

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function generateLoginToken(user: User): string {
  var privateKey = config.keys.private.replace(/\\n/gm, "\n");

  var token = jwt.sign({ id: user.id, email: user.email }, privateKey, {
    expiresIn: "3d",
    algorithm: "RS256",
  });
  return token;
}

function verifyMagicLink(token): TokenPayload {
  var decoded = jwt.verify(token, config.magic.key);
  return decoded as TokenPayload;
}

/**
 * Returns base64url encoded buffer of the given length
 * @param  {Number} len - length of the buffer
 * @return {String}     - base64url random buffer
 */
let randomBase64URLBuffer = (len) => {
  len = len || 32;

  let buff = crypto.randomBytes(len);

  return base64url(buff);
};

/**
 * Generates makeCredentials request
 * @param  {String} username       - username
 * @param  {String} displayName    - user's personal display name
 * @param  {String} id             - user's base64url encoded id
 * @return {MakePublicKeyCredentialOptions} - server encoded make credentials request
 */
let generateServerMakeCredRequest = (email, displayName, id, challenge) => {
  return {
    challenge: Buffer.from(challenge).toString("base64"),
    rp: {
      name: "Dotworld Technologies",
      id: "localhost",
    },
    user: {
      id: Buffer.from(id).toString("base64"),
      name: email,
      displayName: displayName,
    },
    attestation: "direct",
    timeout: 60000,
    authenticatorSelection: {
      requireResidentKey: false,
      userVerification: "discouraged",
    },
    pubKeyCredParams: [
      {
        type: "public-key",
        alg: -7,
      },
      {
        type: "public-key",
        alg: -35,
      },
      {
        type: "public-key",
        alg: -36,
      },
      {
        type: "public-key",
        alg: -257,
      },
      {
        type: "public-key",
        alg: -258,
      },
      {
        type: "public-key",
        alg: -259,
      },
      {
        type: "public-key",
        alg: -37,
      },
      {
        type: "public-key",
        alg: -38,
      },
      {
        type: "public-key",
        alg: -39,
      },
      {
        type: "public-key",
        alg: -8,
      },
    ],
  };
};

/**
 * U2F Presence constant
 */
let U2F_USER_PRESENTED = 0x01;

/**
 * Parses authenticatorData buffer.
 * @param  {Buffer} buffer - authenticatorData buffer
 * @return {Object}        - parsed authenticatorData struct
 */
let parseMakeCredAuthData = (buffer) => {
  let rpIdHash = buffer.slice(0, 32);
  buffer = buffer.slice(32);
  let flagsBuf = buffer.slice(0, 1);
  buffer = buffer.slice(1);
  let flags = flagsBuf[0];
  let counterBuf = buffer.slice(0, 4);
  buffer = buffer.slice(4);
  let counter = counterBuf.readUInt32BE(0);
  let aaguid = buffer.slice(0, 16);
  buffer = buffer.slice(16);
  let credIDLenBuf = buffer.slice(0, 2);
  buffer = buffer.slice(2);
  let credIDLen = credIDLenBuf.readUInt16BE(0);
  let credID = buffer.slice(0, credIDLen);
  buffer = buffer.slice(credIDLen);
  let COSEPublicKey = buffer;

  return {
    rpIdHash,
    flagsBuf,
    flags,
    counter,
    counterBuf,
    aaguid,
    credID,
    COSEPublicKey,
  };
};

/**
 * Returns SHA-256 digest of the given data.
 * @param  {Buffer} data - data to hash
 * @return {Buffer}      - the hash
 */
let hash = (data) => {
  return crypto.createHash("SHA256").update(data).digest();
};

/**
 * Takes signature, data and PEM public key and tries to verify signature
 * @param  {Buffer} signature
 * @param  {Buffer} data
 * @param  {String} publicKey - PEM encoded public key
 * @return {Boolean}
 */
let verifySignature = (signature, data, publicKey) => {
  return crypto
    .createVerify("SHA256")
    .update(data)
    .verify(publicKey, signature);
};

/**
 * Takes COSE encoded public key and converts it to RAW PKCS ECDHA key
 * @param  {Buffer} COSEPublicKey - COSE encoded public key
 * @return {Buffer}               - RAW PKCS encoded public key
 */
let COSEECDHAtoPKCS = (COSEPublicKey) => {
  /* 
     +------+-------+-------+---------+----------------------------------+
     | name | key   | label | type    | description                      |
     |      | type  |       |         |                                  |
     +------+-------+-------+---------+----------------------------------+
     | crv  | 2     | -1    | int /   | EC Curve identifier - Taken from |
     |      |       |       | tstr    | the COSE Curves registry         |
     |      |       |       |         |                                  |
     | x    | 2     | -2    | bstr    | X Coordinate                     |
     |      |       |       |         |                                  |
     | y    | 2     | -3    | bstr /  | Y Coordinate                     |
     |      |       |       | bool    |                                  |
     |      |       |       |         |                                  |
     | d    | 2     | -4    | bstr    | Private key                      |
     +------+-------+-------+---------+----------------------------------+
  */

  let coseStruct = cbor.decodeAllSync(COSEPublicKey)[0];
  let tag = Buffer.from([0x04]);
  let x = coseStruct.get(-2);
  let y = coseStruct.get(-3);

  return Buffer.concat([tag, x, y]);
};

/**
 * Convert binary certificate or public key to an OpenSSL-compatible PEM text format.
 * @param  {Buffer} buffer - Cert or PubKey buffer
 * @return {String}             - PEM
 */
let ASN1toPEM = (pkBuffer) => {
  if (!Buffer.isBuffer(pkBuffer))
    throw new Error("ASN1toPEM: pkBuffer must be Buffer.");

  let type;
  if (pkBuffer.length == 65 && pkBuffer[0] == 0x04) {
    /*
          If needed, we encode rawpublic key to ASN structure, adding metadata:
          SEQUENCE {
            SEQUENCE {
               OBJECTIDENTIFIER 1.2.840.10045.2.1 (ecPublicKey)
               OBJECTIDENTIFIER 1.2.840.10045.3.1.7 (P-256)
            }
            BITSTRING <raw public key>
          }
          Luckily, to do that, we just need to prefix it with constant 26 bytes (metadata is constant).
      */

    pkBuffer = Buffer.concat([
      Buffer.from(
        "3059301306072a8648ce3d020106082a8648ce3d030107034200",
        "hex"
      ),
      pkBuffer,
    ]);

    type = "PUBLIC KEY";
  } else {
    type = "CERTIFICATE";
  }

  let b64cert = pkBuffer.toString("base64");

  let PEMKey = "";
  for (let i = 0; i < Math.ceil(b64cert.length / 64); i++) {
    let start = 64 * i;

    PEMKey += b64cert.substr(start, 64) + "\n";
  }

  PEMKey = `-----BEGIN ${type}-----\n` + PEMKey + `-----END ${type}-----\n`;

  return PEMKey;
};

const hostname = process.env.HOSTNAME || "localhost";

let verifyAuthenticatorAttestationResponse = (webAuthnResponse) => {
  if (!webAuthnResponse.id) throw new Error("id is missing");

  if (!webAuthnResponse.response.attestationObject)
    throw new Error("attestationObject is missing");

  if (!webAuthnResponse.response.clientDataJSON)
    throw new Error("clientDataJSON is missing");

  let attestationBuffer = base64url.toBuffer(
    webAuthnResponse.response.attestationObject
  );
  let ctapMakeCredResp = cbor.decodeAllSync(attestationBuffer)[0];

  let response = { verified: false };
  if (ctapMakeCredResp.fmt === "fido-u2f") {
    let authrDataStruct = parseMakeCredAuthData(ctapMakeCredResp.authData);

    if (!(authrDataStruct.flags & U2F_USER_PRESENTED))
      throw new Error("User was NOT presented durring authentication!");

    let clientDataHash = hash(
      base64url.toBuffer(webAuthnResponse.response.clientDataJSON)
    );
    let reservedByte = Buffer.from([0x00]);
    let publicKey = COSEECDHAtoPKCS(authrDataStruct.COSEPublicKey);
    let signatureBase = Buffer.concat([
      reservedByte,
      authrDataStruct.rpIdHash,
      clientDataHash,
      authrDataStruct.credID,
      publicKey,
    ]);

    let PEMCertificate = ASN1toPEM(ctapMakeCredResp.attStmt.x5c[0]);
    let signature = ctapMakeCredResp.attStmt.sig;

    response.verified = verifySignature(
      signature,
      signatureBase,
      PEMCertificate
    );

    if (response.verified) {
      response["authrInfo"] = {
        fmt: "fido-u2f",
        publicKey: base64url.encode(publicKey),
        counter: authrDataStruct.counter,
        credID: base64url.encode(authrDataStruct.credID),
      };
    }
  } else if (ctapMakeCredResp.fmt === "tpm") {
    //Step 1-2: Let C be the parsed the client data claimed as collected during
    //the credential creation
    /* let C;
    try {
      let tmp = base64url.decode(webAuthnResponse.response.clientDataJSON);
      console.log(tmp);
      C = JSON.parse(tmp);
    } catch (e) {
      throw new Error("clientDataJSON could not be parsed");
    } */

    //Step 8: Perform CBOR decoding on the attestationObject
    let attestationObject;
    try {
      attestationObject = cbor.decodeFirstSync(
        Buffer.from(webAuthnResponse.response.attestationObject, "base64")
      );
    } catch (e) {
      throw new Error("attestationObject could not be decoded");
    }

    //Step 8.1: Parse authData data inside the attestationObject
    const authenticatorData = parseAuthenticatorData(
      attestationObject.authData
    );
    //Step 8.2: authenticatorData should contain attestedCredentialData
    if (!authenticatorData["attestedCredentialData"])
      throw new Error("Did not see AD flag in authenticatorData");

    //Step 9: Verify that the RP ID hash in authData is indeed the SHA-256 hash
    //of the RP ID expected by the RP.
    if (!authenticatorData.rpIdHash.equals(sha256(hostname))) {
      throw new Error("RPID hash does not match expected value: sha256(rpId)");
    }

    //Step 10: Verify that the User Present bit of the flags in authData is set
    if ((authenticatorData.flags & 0b00000001) == 0) {
      throw new Error("User Present bit was not set.");
    }

    //Step 11: Verify that the User Verified bit of the flags in authData is set
    if ((authenticatorData.flags & 0b00000100) == 0) {
      throw new Error("User Verified bit was not set.");
    }

    //Steps 12-19 are skipped because this is a sample app.

    //Store the credential
    response.verified = true;
    response["authrInfo"] = {
      fmt: "tpm",
      publicKey: authenticatorData["attestedCredentialData"].publicKeyJwk,
      counter: authenticatorData.signCount,
      credID:
        authenticatorData["attestedCredentialData"].credentialId.toString(
          "base64"
        ),
    };
  }
  return response;
};

/**
 * Validates CollectedClientData
 * @param {any} clientData JSON parsed client data object received from client
 * @param {string} type Operation type: webauthn.create or webauthn.get
 */
/* const validateClientData = (clientData, type) => {
  if (clientData.type !== type)
    throw new Error("collectedClientData type was expected to be " + type);

  let origin;
  try {
    origin = url.parse(clientData.origin);
  } catch (e) {
    throw new Error("Invalid origin in collectedClientData");
  }

  if (origin.hostname !== hostname)
    throw new Error(
      "Invalid origin in collectedClientData. Expected hostname " + hostname
    );

   if (hostname !== "localhost" && origin.protocol !== "https:")
    throw new Error(
      "Invalid origin in collectedClientData. Expected HTTPS protocol."
    );
}; */

// TPM

/**
 * Parses authData buffer and returns an authenticator data object
 * @param {Buffer} authData
 * @returns {AuthenticatorData} Parsed AuthenticatorData object
 * @typedef {Object} AuthenticatorData
 * @property {Buffer} rpIdHash
 * @property {number} flags
 * @property {number} signCount
 * @property {AttestedCredentialData} attestedCredentialData
 * @property {string} extensionData
 * @typedef {Object} AttestedCredentialData
 * @property {string} aaguid
 * @property {any} publicKeyJwk
 * @property {string} credentialId
 * @property {number} credentialIdLength
 */
const parseAuthenticatorData = (authData) => {
  try {
    const authenticatorData = {
      rpIdHash: authData.slice(0, 32),
      flags: authData[32],
      signCount:
        (authData[33] << 24) |
        (authData[34] << 16) |
        (authData[35] << 8) |
        authData[36],
    };

    if (authenticatorData.flags & 64) {
      const attestedCredentialData = {};
      attestedCredentialData["aaguid"] = uuid
        .unparse(authData.slice(37, 53))
        .toUpperCase();
      attestedCredentialData["credentialIdLength"] =
        (authData[53] << 8) | authData[54];
      attestedCredentialData["credentialId"] = authData.slice(
        55,
        55 + attestedCredentialData["credentialIdLength"]
      );
      //Public key is the first CBOR element of the remaining buffer
      const publicKeyCoseBuffer = authData.slice(
        55 + attestedCredentialData["credentialIdLength"],
        authData.length
      );

      //convert public key to JWK for storage
      attestedCredentialData["publicKeyJwk"] = coseToJwk(publicKeyCoseBuffer);

      authenticatorData["attestedCredentialData"] = attestedCredentialData;
    }

    if (authenticatorData.flags & 128) {
      //has extension data

      let extensionDataCbor;

      if (authenticatorData["attestedCredentialData"]) {
        //if we have attesttestedCredentialData, then extension data is
        //the second element
        extensionDataCbor = cbor.decodeAllSync(
          authData.slice(
            55 + authenticatorData["attestedCredentialData"].credentialIdLength,
            authData.length
          )
        );
        extensionDataCbor = extensionDataCbor[1];
      } else {
        //Else it's the first element
        extensionDataCbor = cbor.decodeFirstSync(
          authData.slice(37, authData.length)
        );
      }

      authenticatorData["extensionData"] = cbor
        .encode(extensionDataCbor)
        .toString("base64");
    }

    return authenticatorData;
  } catch (e) {
    console.error(e);
    throw new Error("Authenticator Data could not be parsed");
  }
};

/**
 * Converts a COSE key to a JWK
 * @param {Buffer} cose Buffer containing COSE key data
 * @returns {any} JWK object
 */
const coseToJwk = (cose) => {
  try {
    let publicKeyJwk = {};
    const publicKeyCbor = cbor.decodeFirstSync(cose);

    if (publicKeyCbor.get(3) == -7) {
      publicKeyJwk = {
        kty: "EC",
        crv: "P-256",
        x: publicKeyCbor.get(-2).toString("base64"),
        y: publicKeyCbor.get(-3).toString("base64"),
      };
    } else if (publicKeyCbor.get(3) == -257) {
      publicKeyJwk = {
        kty: "RSA",
        n: publicKeyCbor.get(-1).toString("base64"),
        e: publicKeyCbor.get(-2).toString("base64"),
      };
    } else {
      throw new Error("Unknown public key algorithm");
    }

    return publicKeyJwk;
  } catch (e) {
    console.log(e);
    throw new Error("Could not decode COSE Key");
  }
};

/**
 * Evaluates the sha256 hash of a buffer
 * @param {Buffer} data
 * @returns sha256 of the input data
 */
const sha256 = (data) => {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest();
};

/**
 * Takes an array of registered authenticators and find one specified by credID
 * @param  {String} credID        - base64url encoded credential
 * @param  {Array} authenticators - list of authenticators
 * @return {Object}               - found authenticator
 */
let findAuthr = (credID, authenticators) => {
  for (let authr of authenticators) {
    if (authr.credID === credID) return authr;
  }

  throw new Error(`Unknown authenticator with credID ${credID}!`);
};

/**
 * Parses AuthenticatorData from GetAssertion response
 * @param  {Buffer} buffer - Auth data buffer
 * @return {Object}        - parsed authenticatorData struct
 */
let parseGetAssertAuthData = (buffer) => {
  let rpIdHash = buffer.slice(0, 32);
  buffer = buffer.slice(32);
  let flagsBuf = buffer.slice(0, 1);
  buffer = buffer.slice(1);
  let flags = flagsBuf[0];
  let counterBuf = buffer.slice(0, 4);
  buffer = buffer.slice(4);
  let counter = counterBuf.readUInt32BE(0);

  return { rpIdHash, flagsBuf, flags, counter, counterBuf };
};

// Authentication
let verifyAuthenticatorAssertionResponse = (
  webAuthnResponse,
  authenticators
) => {
  let credential = findAuthr(webAuthnResponse.id, authenticators);
  if (!credential) {
    throw new Error("Could not find credential with that ID");
  }

  let response = { verified: false };
  if (credential.fmt === "fido-u2f") {
    let authenticatorData = base64url.toBuffer(
      webAuthnResponse.response.authenticatorData
    );
    let authrDataStruct = parseGetAssertAuthData(authenticatorData);

    if (!(authrDataStruct.flags & U2F_USER_PRESENTED))
      throw new Error("User was NOT presented durring authentication!");

    let clientDataHash = hash(
      base64url.toBuffer(webAuthnResponse.response.clientDataJSON)
    );
    let signatureBase = Buffer.concat([
      authrDataStruct.rpIdHash,
      authrDataStruct.flagsBuf,
      authrDataStruct.counterBuf,
      clientDataHash,
    ]);

    let publicKey = ASN1toPEM(base64url.toBuffer(credential.publicKey));
    let signature = base64url.toBuffer(webAuthnResponse.response.signature);

    response.verified = verifySignature(signature, signatureBase, publicKey);

    if (response.verified) {
      if (response["counter"] <= credential.counter)
        throw new Error("Authr counter did not increase!");

      credential.counter = authrDataStruct.counter;
    }
  } else if (credential.fmt === "tpm") {
    const publicKey = credential.publicKey;
    if (!publicKey)
      throw new Error("Could not read stored credential public key");

    // Step 4: Let cData, authData and sig denote the value of credential’s
    // response's clientDataJSON, authenticatorData, and signature respectively
    const cData = base64url.toBuffer(webAuthnResponse.response.clientDataJSON);
    const authData = Buffer.from(
      webAuthnResponse.response.authenticatorData,
      "base64"
    );
    const sig = Buffer.from(webAuthnResponse.signature, "base64");

    //Parse authenticator data used for the next few steps
    const authenticatorData = parseAuthenticatorData(authData);

    //Step 11: Verify that the rpIdHash in authData is the SHA-256 hash of the
    //RP ID expected by the Relying Party.
    if (!authenticatorData.rpIdHash.equals(sha256(hostname))) {
      throw new Error("RPID hash does not match expected value: sha256()");
    }

    //Step 12: Verify that the User Present bit of the flags in authData is set
    if ((authenticatorData.flags & 0b00000001) == 0) {
      throw new Error("User Present bit was not set.");
    }

    //Step 13: Verify that the User Verified bit of the flags in authData is set
    if ((authenticatorData.flags & 0b00000100) == 0) {
      throw new Error("User Verified bit was not set.");
    }

    //Step 14: Verify that the values of the client extension outputs in
    //clientExtensionResults and the authenticator extension outputs in the
    //extensions in authData are as expected
    if (authenticatorData["extensionData"]) {
      //We didn't request any extensions. If extensionData is defined, fail.
      throw new Error("Received unexpected extension data");
    }

    //Step 15: Let hash be the result of computing a hash over the cData using
    //SHA-256.
    const hash = sha256(cData);

    const verify =
      publicKey.kty === "RSA"
        ? crypto.createVerify("RSA-SHA256")
        : crypto.createVerify("sha256");
    verify.update(authData);
    verify.update(hash);

    let verified = verify.verify(jwkToPem(publicKey), sig);
    response["verified"] = verified;

    if (!verified) throw new Error("Could not verify signature");

    return response;
  }

  return response;
};

export default {
  makeid,
  createRoom,
  createToken,
  closeRoom,
  storage,
  formatBytes,
  generateLoginToken,
  verifyMagicLink,
  randomBase64URLBuffer,
  generateServerMakeCredRequest,
  verifyAuthenticatorAssertionResponse,
  verifyAuthenticatorAttestationResponse,
};
