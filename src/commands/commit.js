import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";
import { existsSync } from "fs";
import path from "path";

export async function commit(message, author = null) {
  const logger = new Logger();

  try {
    // Check if we're in a Surge repository
    const surgePath = path.join(process.cwd(), ".surge");
    if (!existsSync(surgePath)) {
      logger.error("Not a Surge repository (or any of the parent directories)");
      return false;
    }

    if (!message) {
      logger.error("Commit message is required");
      return false;
    }

    const repo = new Repository(process.cwd());
    const commitHash = await repo.commit(message, author);
    logger.info(`Created commit ${commitHash}`);
    return true;
  } catch (error) {
    logger.error("Failed to create commit:", error);
    return false;
  }
}
