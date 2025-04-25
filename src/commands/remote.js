import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";
import { RemoteManager } from "../services/RemoteManager.js";

export async function remote(name, url, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    const remoteManager = new RemoteManager(repo);

    if (!name) {
      // List remotes
      const remotes = await remoteManager.listRemotes();
      remotes.forEach((remote) => {
        logger.info(`${remote.name}\t${remote.url}`);
      });
      return true;
    }

    if (options.remove) {
      // Remove remote
      await remoteManager.removeRemote(name);
      logger.success(`Removed remote ${name}`);
      return true;
    }

    if (!url) {
      logger.error("URL is required when adding a remote");
      return false;
    }

    // Add remote
    await remoteManager.addRemote(name, url);
    logger.success(`Added remote ${name} (${url})`);
    return true;
  } catch (error) {
    logger.error("Remote operation failed:", error.message);
    return false;
  }
}
