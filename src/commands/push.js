import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";
import { RemoteManager } from "../services/RemoteManager.js";

export async function push(remoteName, branch, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    const remoteManager = new RemoteManager(repo);

    if (!remoteName) {
      remoteName = "origin";
    }

    if (!branch) {
      branch = await repo.getCurrentBranch();
    }

    logger.info(`Pushing to ${remoteName}/${branch}`);

    // Push changes
    await remoteManager.push(remoteName, branch);

    logger.success(`Successfully pushed to ${remoteName}/${branch}`);
    return true;
  } catch (error) {
    logger.error("Push failed:", error.message);
    return false;
  }
}
