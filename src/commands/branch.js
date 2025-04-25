import { Repository } from '../core/Repository.js';
import { Logger } from '../utils/Logger.js';

export async function branch(name, options = {}) {
    const logger = new Logger();
    
    try {
        const repo = new Repository(process.cwd());
        await repo.initialize();
        
        if (!name) {
            // List branches
            const branches = await repo.listBranches();
            const currentBranch = await repo.getCurrentBranch();
            
            branches.forEach(branch => {
                if (branch === currentBranch) {
                    logger.info(`* ${branch}`);
                } else {
                    logger.info(`  ${branch}`);
                }
            });
            return true;
        }
        
        if (options.delete) {
            // Delete branch
            await repo.deleteBranch(name);
            logger.success(`Deleted branch ${name}`);
            return true;
        }
        
        // Create new branch
        await repo.createBranch(name);
        logger.success(`Created branch ${name}`);
        return true;
    } catch (error) {
        logger.error('Branch operation failed:', error.message);
        return false;
    }
} 