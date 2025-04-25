import { diffLines } from 'diff';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/Logger.js';

export class ConflictResolver {
    constructor() {
        this.logger = new Logger();
    }

    async findConflicts(currentHead, branchHead) {
        const conflicts = [];
        
        // Get the common ancestor
        const ancestor = await this.findCommonAncestor(currentHead, branchHead);
        if (!ancestor) {
            throw new Error('No common ancestor found');
        }

        // Get the file lists for all three commits
        const currentFiles = await this.getCommitFiles(currentHead);
        const branchFiles = await this.getCommitFiles(branchHead);
        const ancestorFiles = await this.getCommitFiles(ancestor);

        // Check for conflicts in each file
        for (const file of new Set([...currentFiles, ...branchFiles])) {
            const currentContent = await this.getFileContent(currentHead, file);
            const branchContent = await this.getFileContent(branchHead, file);
            const ancestorContent = await this.getFileContent(ancestor, file);

            if (this.hasConflict(currentContent, branchContent, ancestorContent)) {
                conflicts.push({
                    file,
                    currentContent,
                    branchContent,
                    ancestorContent
                });
            }
        }

        return conflicts;
    }

    async resolveConflicts(conflicts) {
        for (const conflict of conflicts) {
            this.logger.warn(`Conflict in file: ${conflict.file}`);
            
            // Create conflict markers
            const conflictContent = this.createConflictMarkers(
                conflict.currentContent,
                conflict.branchContent
            );

            // Write the conflict file
            await fs.writeFile(conflict.file, conflictContent);
            
            this.logger.info(`Conflict markers added to ${conflict.file}`);
            this.logger.info('Please resolve the conflicts and run "surge add" to stage the resolved file');
        }

        throw new Error('Conflicts need to be resolved manually');
    }

    async findCommonAncestor(commit1, commit2) {
        // Implementation of the lowest common ancestor algorithm
        const ancestors1 = new Set();
        const ancestors2 = new Set();

        let current1 = commit1;
        let current2 = commit2;

        while (current1 || current2) {
            if (current1) {
                if (ancestors2.has(current1)) return current1;
                ancestors1.add(current1);
                current1 = await this.getParentCommit(current1);
            }

            if (current2) {
                if (ancestors1.has(current2)) return current2;
                ancestors2.add(current2);
                current2 = await this.getParentCommit(current2);
            }
        }

        return null;
    }

    hasConflict(current, branch, ancestor) {
        if (!current && !branch) return false;
        if (!current || !branch) return true;

        const currentDiff = diffLines(ancestor || '', current);
        const branchDiff = diffLines(ancestor || '', branch);

        // Check if the same lines were modified in both versions
        const currentChanges = new Set();
        const branchChanges = new Set();

        currentDiff.forEach(part => {
            if (part.added || part.removed) {
                part.value.split('\n').forEach(line => {
                    currentChanges.add(line);
                });
            }
        });

        branchDiff.forEach(part => {
            if (part.added || part.removed) {
                part.value.split('\n').forEach(line => {
                    branchChanges.add(line);
                });
            }
        });

        // Check for overlapping changes
        for (const line of currentChanges) {
            if (branchChanges.has(line)) {
                return true;
            }
        }

        return false;
    }

    createConflictMarkers(current, branch) {
        return `<<<<<<< HEAD\n${current}=======\n${branch}>>>>>>> branch\n`;
    }

    async getCommitFiles(commitHash) {
        // Implementation to get files from a commit
        // This would typically read from the database or file system
        return [];
    }

    async getFileContent(commitHash, file) {
        // Implementation to get file content from a commit
        // This would typically read from the database or file system
        return '';
    }

    async getParentCommit(commitHash) {
        // Implementation to get parent commit
        // This would typically read from the database or file system
        return null;
    }
} 