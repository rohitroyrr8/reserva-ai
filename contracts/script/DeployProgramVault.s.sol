// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ProgramVault} from "../src/ProgramVault.sol";

/// @notice Deploys ProgramVault against a real USDC address.
///
/// Usage (testnet):
///   forge script script/DeployProgramVault.s.sol:DeployProgramVault \
///     --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
///
/// Required env vars — see contracts/.env.example:
///   USDC_ADDRESS        stablecoin the vault denominates in
///   VAULT_OWNER         merchant's policy-controlled wallet (Privy)
///   VAULT_ISSUER        Reserva API/agent's signer address
///   VAULT_SECOND_APPROVER  distinct address required to approve withdrawals
contract DeployProgramVault is Script {
    function run() external returns (ProgramVault vault) {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address owner = vm.envAddress("VAULT_OWNER");
        address issuer = vm.envAddress("VAULT_ISSUER");
        address secondApprover = vm.envAddress("VAULT_SECOND_APPROVER");

        vm.startBroadcast();
        vault = new ProgramVault(usdc, owner, issuer, secondApprover);
        vm.stopBroadcast();

        console.log("ProgramVault deployed:", address(vault));
        console.log("  asset (USDC):       ", usdc);
        console.log("  owner:              ", owner);
        console.log("  issuer:             ", issuer);
        console.log("  secondApprover:     ", secondApprover);
    }
}
