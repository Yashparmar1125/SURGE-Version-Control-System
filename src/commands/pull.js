import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";
import { RemoteManager } from "../services/RemoteManager.js";
import { ConflictResolver } from "../services/ConflictResolver.js";

export async function pull(remoteName, branch, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    const remoteManager = new RemoteManager(repo);
    const conflictResolver = new ConflictResolver(repo);

    if (!remoteName) {
      remoteName = "origin";
    }

    if (!branch) {
      branch = await repo.getCurrentBranch();
    }

    logger.info(`Pulling from ${remoteName}/${branch}`);

    // Fetch changes
    await remoteManager.fetch(remoteName, branch);

    // Check for conflicts
    const conflicts = await conflictResolver.findConflicts(
      await repo.getCurrentBranch(),
      `${remoteName}/${branch}`
    );

    if (conflicts.length > 0) {
      if (options.autoResolve) {
        await conflictResolver.resolveConflicts(conflicts);
        logger.success("Auto-resolved conflicts");
      } else {
        logger.warn("Conflicts detected. Please resolve them manually.");
        return false;
      }
    }

    // Merge changes
    await remoteManager.merge(remoteName, branch);

    logger.success(`Successfully pulled from ${remoteName}/${branch}`);
    return true;
  } catch (error) {
    logger.error("Pull failed:", error.message);
    return false;
  }
}
