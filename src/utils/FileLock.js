import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import lockfile from 'lockfile';

export class FileLock {
    constructor() {
        this.lockPath = path.join(process.cwd(), '.surge', 'lock');
    }

    async acquire() {
        try {
            await new Promise((resolve, reject) => {
                lockfile.lock(this.lockPath, { retries: 10, retryWait: 100 }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            throw new Error('Failed to acquire lock. Another process might be using the repository.');
        }
    }

    async release() {
        try {
            await new Promise((resolve, reject) => {
                lockfile.unlock(this.lockPath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            // If the lock file doesn't exist, it's already released
            if (!existsSync(this.lockPath)) return;
            throw new Error('Failed to release lock');
        }
    }

    async isLocked() {
        return existsSync(this.lockPath);
    }
} 