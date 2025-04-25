import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";
import { ConflictResolver } from "../services/ConflictResolver.js";

export async function rebase(branch, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    const currentBranch = await repo.getCurrentBranch();
    logger.info(`Rebasing ${currentBranch} onto ${branch}`);

    if (options.interactive) {
      // Interactive rebase
      const commits = await repo.getCommitsToRebase(currentBranch, branch);
      logger.info("Commits to be rebased:");
      commits.forEach((commit) => {
        logger.info(`- ${commit.hash}: ${commit.message}`);
      });

      // TODO: Implement interactive rebase UI
      logger.warn("Interactive rebase not yet implemented");
      return false;
    }

    // Check for conflicts
    const conflictResolver = new ConflictResolver(repo);
    const conflicts = await conflictResolver.findConflicts(
      currentBranch,
      branch
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

    // Perform rebase
    await repo.rebase(branch);
    logger.success(`Successfully rebased ${currentBranch} onto ${branch}`);
    return true;
  } catch (error) {
    logger.error("Rebase failed:", error.message);
    return false;
  }
}
