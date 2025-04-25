import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";

export async function stash(message, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    if (options.list) {
      // List stashes
      const stashes = await repo.listStashes();
      if (stashes.length === 0) {
        logger.info("No stashes found");
        return true;
      }

      stashes.forEach((stash) => {
        logger.info(`stash@{${stash.index}}: ${stash.message}`);
      });
      return true;
    }

    if (options.pop) {
      // Pop stash
      const stash = await repo.popStash();
      logger.success(`Popped stash: ${stash.message}`);
      return true;
    }

    if (options.apply) {
      // Apply stash
      const stash = await repo.applyStash();
      logger.success(`Applied stash: ${stash.message}`);
      return true;
    }

    if (options.drop) {
      // Drop stash
      await repo.dropStash();
      logger.success("Dropped stash");
      return true;
    }

    // Create stash
    const stash = await repo.createStash(message);
    logger.success(`Created stash: ${stash.message}`);
    return true;
  } catch (error) {
    logger.error("Stash operation failed:", error.message);
    return false;
  }
}
