import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";

export async function tag(name, commit, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    if (!name) {
      // List tags
      const tags = await repo.listTags();
      if (tags.length === 0) {
        logger.info("No tags found");
        return true;
      }

      tags.forEach((tag) => {
        logger.info(`${tag.name} (${tag.commit})`);
      });
      return true;
    }

    if (options.delete) {
      // Delete tag
      await repo.deleteTag(name);
      logger.success(`Deleted tag ${name}`);
      return true;
    }

    if (!commit) {
      commit = "HEAD";
    }

    // Create tag
    await repo.createTag(name, commit);
    logger.success(`Created tag ${name} at ${commit}`);
    return true;
  } catch (error) {
    logger.error("Tag operation failed:", error.message);
    return false;
  }
}
