import { Repository } from "../core/Repository.js";
import { Logger } from "../utils/Logger.js";

export async function config(key, value, options = {}) {
  const logger = new Logger();

  try {
    const repo = new Repository(process.cwd());
    await repo.initialize();

    if (!key) {
      // List all config
      const config = await repo.getConfig();
      Object.entries(config).forEach(([k, v]) => {
        logger.info(`${k}=${v}`);
      });
      return true;
    }

    if (options.unset) {
      // Remove config
      await repo.removeConfig(key);
      logger.success(`Removed config ${key}`);
      return true;
    }

    if (!value) {
      // Get config value
      const configValue = await repo.getConfig(key);
      if (configValue) {
        logger.info(configValue);
      } else {
        logger.warn(`Config ${key} not found`);
      }
      return true;
    }

    // Set config value
    await repo.setConfig(key, value);
    logger.success(`Set config ${key}=${value}`);
    return true;
  } catch (error) {
    logger.error("Config operation failed:", error.message);
    return false;
  }
}
