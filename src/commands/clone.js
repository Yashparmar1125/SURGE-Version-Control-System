import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";
import { RemoteManager } from "../services/RemoteManager.js";
import fs from "fs/promises";
import path from "path";

export async function clone(url, directory) {
  const logger = new Logger();

  try {
    if (!url) {
      logger.error("Repository URL is required");
      return false;
    }

    // Determine target directory
    if (!directory) {
      directory = path.basename(url, ".git");
    }

    // Create directory
    await fs.mkdir(directory, { recursive: true });

    // Initialize repository
    const repo = new Repository(directory);
    await repo.initialize();

    // Clone from remote
    const remoteManager = new RemoteManager(repo);
    await remoteManager.clone(url, directory);

    logger.success(`Cloned repository into ${directory}`);
    return true;
  } catch (error) {
    logger.error("Clone failed:", error.message);
    return false;
  }
}
