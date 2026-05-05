import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseUnits } from "ethers";

const deployPrizeLock: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (!["hardhat", "localhost"].includes(hre.network.name)) {
    throw new Error("PrizeLock MVP deploy is local-only. Use the local Hardhat chain.");
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("MockERC20", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  await deploy("PrizeLockEscrow", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  const mockToken = await hre.ethers.getContractAt("MockERC20", (await hre.deployments.get("MockERC20")).address);
  const demoAmount = parseUnits("1000000", 18);

  // Mint local demo tokens to the deployer so the app has funds to test with.
  await mockToken.mint(deployer, demoAmount, { gasLimit: 100_000 });

  console.log("MockERC20 demo tokens minted to deployer:", deployer);
};

export default deployPrizeLock;

deployPrizeLock.tags = ["PrizeLock"];
