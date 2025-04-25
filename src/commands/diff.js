import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";

export async function diff(commit1, commit2, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    if (!commit1) {
      commit1 = "HEAD";
    }

    if (!commit2) {
      commit2 = "WORKING";
    }

    const changes = await repo.getDiff(commit1, commit2);

    if (changes.length === 0) {
      logger.info("No changes found");
      return true;
    }

    changes.forEach((change) => {
      logger.info(`File: ${change.file}`);
      logger.info(`Status: ${change.status}`);

      if (change.diff) {
        logger.info("Changes:");
        logger.info(change.diff);
      }

      logger.info("");
    });

    return true;
  } catch (error) {
    logger.error("Diff failed:", error.message);
    return false;
  }
}
