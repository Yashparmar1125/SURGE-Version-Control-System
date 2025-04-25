import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";

export async function show(commit, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    if (!commit) {
      commit = "HEAD";
    }

    const commitDetails = await repo.getCommitDetails(commit);

    if (!commitDetails) {
      logger.error(`Commit ${commit} not found`);
      return false;
    }

    // Display commit details
    logger.info(`commit ${commitDetails.hash}`);
    logger.info(`Author: ${commitDetails.author} <${commitDetails.email}>`);
    logger.info(`Date: ${new Date(commitDetails.timestamp).toLocaleString()}`);
    logger.info("");
    logger.info(`    ${commitDetails.message}`);
    logger.info("");

    if (options.stat) {
      // Show file statistics
      logger.info("Changes:");
      commitDetails.changes.forEach((change) => {
        logger.info(`  ${change.status}: ${change.file}`);
      });
    }

    if (options.patch) {
      // Show patch
      logger.info("Patch:");
      commitDetails.patch.forEach((patch) => {
        logger.info(`--- ${patch.oldFile}`);
        logger.info(`+++ ${patch.newFile}`);
        logger.info(patch.diff);
      });
    }

    return true;
  } catch (error) {
    logger.error("Show failed:", error.message);
    return false;
  }
}
