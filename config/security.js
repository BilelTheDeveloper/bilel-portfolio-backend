const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' });
const tokenOptions = { algorithms: ['HS256'], issuer: 'bilel-api', audience: 'bilel-admin' };
const signToken = (payload, expiresIn) => jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', issuer: tokenOptions.issuer, audience: tokenOptions.audience, expiresIn, jwtid: crypto.randomUUID() });
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, tokenOptions);
const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());
module.exports = { cookieOptions, signToken, verifyToken, safeEqual };
