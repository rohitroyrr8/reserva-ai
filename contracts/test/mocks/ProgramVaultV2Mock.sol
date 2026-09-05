// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProgramVault} from "../../src/ProgramVault.sol";

/// @notice Test-only stand-in for a future ProgramVault upgrade. Adds one
///         new function without touching the existing storage layout, so
///         tests can prove `upgradeToAndCall` swaps logic while preserving
///         every program's state.
contract ProgramVaultV2Mock is ProgramVault {
    constructor(address _asset) ProgramVault(_asset) {}

    function version() external pure returns (string memory) {
        return "v2";
    }
}
