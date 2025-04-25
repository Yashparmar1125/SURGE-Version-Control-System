import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";

export async function checkout(target, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    if (options.file) {
      // Restore file from index
      await repo.restoreFile(target);
      logger.success(`Restored ${target}`);
      return true;
    }

    // Switch branch
    await repo.switchBranch(target);
    logger.success(`Switched to branch '${target}'`);
    return true;
  } catch (error) {
    logger.error("Checkout failed:", error.message);
    return false;
  }
}
