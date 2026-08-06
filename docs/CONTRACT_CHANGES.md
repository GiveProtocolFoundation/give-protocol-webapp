# Contract Changes: Token-Agnostic Fee Collection

**Version:** 1.0
**Date:** February 2025
**Target Repository:** `give-protocol-contracts`
**Applicable Chains:** Base, Ethereum, Optimism, Arbitrum, Polygon, Avalanche (EVM-Compatible)

## Overview

This document outlines the required changes to the Give Protocol smart contracts to implement a mandatory 0.5% platform fee model, replacing the current voluntary tip system.

---

## Current vs. Proposed Architecture

### Current Model (Voluntary Tips)

```solidity
// DurationDonation.sol - Current signature
function processDonation(
    address charity,
    address token,
    uint256 charityAmount,
    uint256 platformTip  // Donor chooses 0-20%
) external;
```

### Proposed Model (Mandatory 0.5% Fee)

```solidity
// DurationDonation.sol - New signature
function processDonation(
    address charity,
    address token,
    uint256 donationAmount  // Full amount, fee calculated internally
) external;
```

---

## Required Changes

### 1. DurationDonation.sol

#### Remove/Deprecate

- `suggestedTipRates` array
- `calculateSuggestedTip()` function
- `processDonationWithSuggestedTip()` function
- `processDonationWithPercentageTip()` function
- `platformTip` parameter from `processDonation()`

#### Add

```solidity
// New constants
uint256 public constant PLATFORM_FEE_PERCENT = 50; // 0.5% = 50 basis points

// Optional: Per-token minimum donations to prevent dust attacks
mapping(address => uint256) public minDonationByToken;

// Admin function to set minimum donation amounts
function setMinDonation(address token, uint256 minAmount) external onlyOwner {
    minDonationByToken[token] = minAmount;
    emit MinDonationUpdated(token, minAmount);
}

event MinDonationUpdated(address indexed token, uint256 minAmount);
```

#### Modified Function

```solidity
/**
 * @notice Process a donation with automatic 0.5% platform fee
 * @param charity Verified charity address
 * @param token ERC-20 token address
 * @param donationAmount Total amount (fee will be deducted)
 */
function processDonation(
    address charity,
    address token,
    uint256 donationAmount
) external nonReentrant whenNotPaused {
    // Validation
    require(charities[charity].isActive, "CharityNotActive");
    require(donationAmount >= minDonationByToken[token], "BelowMinimum");

    // Calculate fee (0.5%)
    uint256 platformFee = (donationAmount * PLATFORM_FEE_PERCENT) / BASIS_POINTS;
    uint256 charityAmount = donationAmount - platformFee;

    // Transfer full amount from donor
    IERC20(token).safeTransferFrom(msg.sender, address(this), donationAmount);

    // Send charity portion
    IERC20(token).safeTransfer(charity, charityAmount);

    // Send fee to treasury
    IERC20(token).safeTransfer(giveProtocolTreasury, platformFee);

    // Update tracking
    charities[charity].totalReceived += charityAmount;
    donations[msg.sender][charity] += charityAmount;

    // Generate tax receipt and emit events
    bytes32 receiptId = _generateReceipt(
        msg.sender,
        charity,
        charityAmount,
        platformFee,
        token
    );

    emit DonationProcessed(
        msg.sender,
        charity,
        token,
        charityAmount,
        platformFee,
        charityAmount, // totalTaxDeductible = charity amount only
        block.timestamp,
        receiptId
    );
}
```

---

### 2. Event Schema Update

```solidity
// Updated event (remove tipOption, add platformFee as automatic)
event DonationProcessed(
    address indexed donor,
    address indexed charity,
    address token,
    uint256 charityAmount,
    uint256 platformFee,      // Was platformTip (now automatic)
    uint256 totalTaxDeductible,
    uint256 timestamp,
    bytes32 donationId
);
```

---

### 3. Deployment Configuration

Set minimum donations after deployment:

```javascript
// Base deployment
await contract.setMinDonation(USDC_BASE, parseUnits("1", 6)); // $1 minimum
await contract.setMinDonation(DAI_BASE, parseUnits("1", 18)); // $1 minimum
await contract.setMinDonation(WETH_BASE, parseUnits("0.0003", 18)); // ~$1 at $3k ETH

// Optimism deployment
await contract.setMinDonation(USDC_OP, parseUnits("1", 6));
await contract.setMinDonation(DAI_OP, parseUnits("1", 18));
await contract.setMinDonation(OP_TOKEN, parseUnits("1", 18)); // ~$1.50
```

---

### 4. Token Addresses by Chain

#### Base Mainnet (Chain ID: 8453)

| Token | Address                                      | Decimals |
| ----- | -------------------------------------------- | -------- |
| USDC  | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6        |
| USDT  | `0xfde4C96c8593536E31F229d6156B4d8D02642F84` | 6        |
| DAI   | `0x50c5725949A6F0c72E6C4a641F24049B1AE50db8` | 18       |
| WETH  | `0x4200000000000000000000000000000000000006` | 18       |

#### Optimism Mainnet (Chain ID: 10)

| Token            | Address                                      | Decimals |
| ---------------- | -------------------------------------------- | -------- |
| USDC (Native)    | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | 6        |
| USDC.e (Bridged) | `0x7F5c764cBc14f9669B88837ca1490cCa17c31607` | 6        |
| USDT             | `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58` | 6        |
| DAI              | `0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1` | 18       |
| OP               | `0x4200000000000000000000000000000000000042` | 18       |
| WETH             | `0x4200000000000000000000000000000000000006` | 18       |

---

## Frontend Integration Notes

The webapp has been updated to:

1. **Chain-aware token selection** - `src/config/tokens.ts` now exports `CHAIN_TOKENS` and `getERC20TokensForChain(chainId)`
2. **Dynamic token lists** - `DonationForm.tsx` and `ScheduledDonationForm.tsx` use `chainId` from Web3Context
3. **Automatic token reset** - When user switches chains, the token selector resets to the first available token

### Updated Frontend Hook Call

```typescript
// Before (with tip)
await donate({
  charityAddress,
  amount: amount.toString(),
  type: DonationType._TOKEN,
  _tokenAddress: selectedToken.address,
});

// After (no tip parameter - contract handles fee)
// Same signature works, but contract now takes 0.5% automatically
```

---

## Migration Checklist

- [ ] Update `DurationDonation.sol` with new fee logic
- [ ] Remove deprecated tip functions
- [ ] Add `minDonationByToken` mapping and setter
- [ ] Update event schema
- [ ] Deploy to Base Sepolia testnet
- [ ] Deploy to Optimism Sepolia testnet
- [ ] Verify contracts on block explorers
- [ ] Set minimum donation amounts per token
- [ ] Update webapp environment variables with new contract addresses
- [ ] Test end-to-end donation flow on testnets
- [ ] Deploy to mainnets
