import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";

export async function log(options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    const commits = await repo.getCommitHistory(options);

    if (commits.length === 0) {
      logger.info("No commits yet");
      return true;
    }

    commits.forEach((commit) => {
      logger.info(`commit ${commit.hash}`);
      logger.info(`Author: ${commit.author} <${commit.email}>`);
      logger.info(`Date: ${new Date(commit.timestamp).toLocaleString()}`);
      logger.info("");
      logger.info(`    ${commit.message}`);
      logger.info("");
    });

    return true;
  } catch (error) {
    logger.error("Failed to get commit history:", error.message);
    return false;
  }
}
