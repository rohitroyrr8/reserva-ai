// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ProgramVault} from "../src/ProgramVault.sol";

/// @notice Deploys a new ProgramVault implementation and points the
///         existing proxy at it. Must be broadcast from `PROTOCOL_ADMIN`'s
///         key (the address passed to `initialize` at first deploy) — the
///         proxy's `_authorizeUpgrade` is `onlyOwner`-gated to that address.
///
/// Usage:
///   forge script script/UpgradeProgramVault.s.sol:UpgradeProgramVault \
///     --rpc-url arc_testnet --broadcast --private-key $PROTOCOL_ADMIN_PRIVATE_KEY
///
/// Required env vars — see contracts/.env.example:
///   USDC_ADDRESS            passed again to the new implementation's constructor (immutable, must match the original)
///   PROGRAM_VAULT_PROXY     the existing proxy address to upgrade
contract UpgradeProgramVault is Script {
    function run() external returns (address newImplementation) {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address proxy = vm.envAddress("PROGRAM_VAULT_PROXY");

        vm.startBroadcast();
        newImplementation = address(new ProgramVault(usdc));
        ProgramVault(proxy).upgradeToAndCall(newImplementation, "");
        vm.stopBroadcast();

        console.log("ProgramVault proxy:          ", proxy);
        console.log("  upgraded to implementation:", newImplementation);
    }
}
