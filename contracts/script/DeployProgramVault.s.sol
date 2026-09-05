// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ProgramVault} from "../src/ProgramVault.sol";

/// @notice One-time deploy: implementation + ERC1967 proxy, initialized.
///         Every merchant program afterwards is opened self-serve via
///         `ProgramVault(proxy).createProgram(...)` — no further deploys.
///
/// Usage (testnet):
///   forge script script/DeployProgramVault.s.sol:DeployProgramVault \
///     --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
///
/// Required env vars — see contracts/.env.example:
///   USDC_ADDRESS     stablecoin every program denominates in (immutable, baked into the implementation)
///   PROTOCOL_ADMIN   Reserva-side key authorized to `upgradeToAndCall` later — not a merchant
contract DeployProgramVault is Script {
    function run() external returns (ProgramVault vault, address implementation) {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address protocolAdmin = vm.envAddress("PROTOCOL_ADMIN");

        vm.startBroadcast();
        implementation = address(new ProgramVault(usdc));
        bytes memory initData = abi.encodeCall(ProgramVault.initialize, (protocolAdmin));
        address proxy = address(new ERC1967Proxy(implementation, initData));
        vm.stopBroadcast();

        vault = ProgramVault(proxy);

        console.log("ProgramVault proxy deployed:  ", proxy);
        console.log("  implementation:             ", implementation);
        console.log("  asset (USDC):               ", usdc);
        console.log("  protocolAdmin (upgrade key):", protocolAdmin);
    }
}
