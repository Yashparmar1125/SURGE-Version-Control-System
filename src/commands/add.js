import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function add(files) {
  const logger = new Logger();

  try {
    // Check if we're in a Surge repository
    const surgePath = path.join(process.cwd(), ".surge");
    if (!existsSync(surgePath)) {
      logger.error("Not a Surge repository (or any of the parent directories)");
      return false;
    }

    const repo = new Repository(process.cwd());

    // Handle both single file and multiple files
    const fileList = Array.isArray(files) ? files : [files];

    // Verify files exist before adding
    for (const file of fileList) {
      const filePath = path.resolve(file);
      if (!existsSync(filePath)) {
        logger.error(`File not found: ${file}`);
        return false;
      }
    }

    // Add files to repository
    await repo.add(fileList);
    logger.info(`Added ${fileList.join(", ")} to staging area`);

    return true;
  } catch (error) {
    logger.error("Failed to add files:", error);
    return false;
  }
}
