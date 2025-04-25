import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";
import { ConflictResolver } from "../services/ConflictResolver.js";

export async function merge(branch, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    const currentBranch = await repo.getCurrentBranch();
    logger.info(`Merging ${branch} into ${currentBranch}`);

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

    // Perform merge
    await repo.merge(branch);
    logger.success(`Successfully merged ${branch} into ${currentBranch}`);
    return true;
  } catch (error) {
    logger.error("Merge failed:", error.message);
    return false;
  }
}
