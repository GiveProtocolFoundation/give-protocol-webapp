// Global mock for ethers module to prevent ESM module cache issues
// Mapped via moduleNameMapper to intercept all ethers imports in tests

import { jest } from "@jest/globals";

// Shared mock functions that individual tests can configure
export const mockLatestRoundData = jest.fn();
export const mockDecimals = jest.fn();

/** Simple keccak256 stand-in: produces a deterministic 0x-prefixed 64-char hex string */
const simpleKeccak256 = (data) => {
  // Accept Uint8Array or hex string; convert to a regular string for hashing
  let str = "";
  if (data instanceof Uint8Array) {
    str = Array.from(data)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else if (typeof data === "string") {
    str = data;
  } else {
    str = String(data);
  }
  // Simple hash: use a basic FNV-like approach to produce a 64-char hex digest
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ code, 0x811c9dc5) >>> 0;
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  const hex3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0");
  const hex4 = (Math.imul(h1, h2) >>> 0).toString(16).padStart(8, "0");
  const hex5 = (Math.imul(h1 ^ 0xa5a5a5a5, h2 ^ 0x5a5a5a5a) >>> 0)
    .toString(16)
    .padStart(8, "0");
  const hex6 = ((h1 + h2) >>> 0).toString(16).padStart(8, "0");
  const hex7 = (Math.imul(h1, 0xdeadbeef) >>> 0).toString(16).padStart(8, "0");
  const hex8 = (Math.imul(h2, 0xcafebabe) >>> 0).toString(16).padStart(8, "0");
  return `0x${hex1}${hex2}${hex3}${hex4}${hex5}${hex6}${hex7}${hex8}`;
};

/** Convert a UTF-8 string to a Uint8Array, mirroring ethers.toUtf8Bytes */
export const toUtf8Bytes = (text) => {
  const buf = Buffer.from(text, "utf-8");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};

export const ethers = {
  Contract: jest.fn().mockImplementation(() => ({
    latestRoundData: mockLatestRoundData,
    decimals: mockDecimals,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    _isProvider: true,
  })),
  BrowserProvider: jest.fn().mockImplementation(() => ({
    getSigner: jest.fn().mockResolvedValue({}),
  })),
  formatUnits: (value, decimals) => {
    return (Number(value) / Math.pow(10, Number(decimals))).toString();
  },
  parseEther: (value) => BigInt(Math.round(Number(value) * 1e18)),
  formatEther: (value) => (Number(value) / 1e18).toString(),
  keccak256: simpleKeccak256,
  toUtf8Bytes,
};

// Named re-exports for files that use `import { Contract, parseEther, ... } from "ethers"`
export const Contract = ethers.Contract;
export const BrowserProvider = ethers.BrowserProvider;
export const JsonRpcProvider = ethers.JsonRpcProvider;
export const parseEther = ethers.parseEther;
export const formatEther = ethers.formatEther;
export const formatUnits = ethers.formatUnits;
export const keccak256 = ethers.keccak256;
/** @param {string} addr @returns {string} */
export const getAddress = (addr) => addr;
/** @param {unknown} addr @returns {boolean} */
export const isAddress = (addr) =>
  typeof addr === "string" && addr.startsWith("0x");
export const ZeroAddress = "0x0000000000000000000000000000000000000000";
export const MaxUint256 = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
);
export const ContractInterface = undefined;

// Reset helpers for use in beforeEach
export const resetEthersMock = () => {
  mockLatestRoundData.mockReset();
  mockDecimals.mockReset();
  ethers.Contract.mockClear();
  ethers.JsonRpcProvider.mockClear();
};
