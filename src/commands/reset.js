import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";

export async function reset(commit, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    if (!commit) {
      commit = "HEAD";
    }

    if (options.hard) {
      // Hard reset
      await repo.hardReset(commit);
      logger.success(`Reset to ${commit} (hard)`);
    } else if (options.mixed) {
      // Mixed reset
      await repo.mixedReset(commit);
      logger.success(`Reset to ${commit} (mixed)`);
    } else {
      // Soft reset
      await repo.softReset(commit);
      logger.success(`Reset to ${commit} (soft)`);
    }

    return true;
  } catch (error) {
    logger.error("Reset failed:", error.message);
    return false;
  }
}
