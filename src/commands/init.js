import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";
import fs from "fs/promises";
import path from "path";

export async function init(directory = ".") {
  const logger = new Logger();

  try {
    // Create repository directory
    const repoPath = path.resolve(directory);
    await fs.mkdir(repoPath, { recursive: true });

    // Initialize repository
    const repo = new Repository(repoPath);
    await repo.init();

    logger.info(`Initialized empty Surge repository in ${repoPath}`);
    return true;
  } catch (error) {
    logger.error("Failed to initialize repository:", error);
    console.error("Detailed error:", error);
    return false;
  }
}
