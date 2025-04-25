import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";

export async function status() {
  const logger = new Logger();
  try {
    const repo = new Repository();
    if (!repo.isInitialized()) {
      logger.error("Not a Surge repository");
      return;
    }

    const status = await repo.getStatus();
    const { staged, modified, untracked } = status;

    if (
      staged.length === 0 &&
      modified.length === 0 &&
      untracked.length === 0
    ) {
      logger.info("No changes to commit, working tree clean");
      return;
    }

    if (staged.length > 0) {
      logger.info("Changes to be committed:");
      staged.forEach((file) => {
        logger.info(`  (staged) ${file}`);
      });
    }

    if (modified.length > 0) {
      logger.info("\nChanges not staged for commit:");
      modified.forEach((file) => {
        logger.info(`  (modified) ${file}`);
      });
    }

    if (untracked.length > 0) {
      logger.info("\nUntracked files:");
      untracked.forEach((file) => {
        logger.info(`  (untracked) ${file}`);
      });
    }
  } catch (error) {
    logger.error("Failed to get status", error);
  }
}
