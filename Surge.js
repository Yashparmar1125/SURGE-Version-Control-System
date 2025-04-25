import { diffLines } from 'diff';
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import chalk from 'chalk';
import { Command } from 'commander';
import { existsSync } from 'fs'

const program = new Command();

class Surge {
    constructor(repoPath = '.') {
        this.repoPath = path.join(repoPath, '.surge');
        this.objectsPath = path.join(this.repoPath, 'objects');
        this.headPath = path.join(this.repoPath, 'HEAD');
        this.indexPath = path.join(this.repoPath, 'index');
        this.configPath = path.join(this.repoPath, 'config.json');
        this.ignorePath = path.join(this.repoPath, '.surgeignore');
        this.branchesPath = path.join(this.repoPath, 'refs/heads');
        this.init();
    }

    async init() {
        await fs.mkdir(this.objectsPath, { recursive: true });
        await fs.mkdir(this.branchesPath, { recursive: true });
        try {
            await fs.writeFile(this.headPath, '', { flag: 'wx' });
            await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: 'wx' });
            await fs.writeFile(this.configPath, JSON.stringify({}), { flag: 'wx' });
            console.log(chalk.green('Initialized empty Surge repo'));
        } catch {
            console.log("Already initialized the .surge folder");
        }
    }

    async loadConfig() {
        if (!existsSync(this.configPath)) return {};
        const data = await fs.readFile(this.configPath, 'utf-8');
        return JSON.parse(data || '{}');
    }

    async config(username, email) {
        const data = { username, email };
        await fs.writeFile(this.configPath, JSON.stringify(data));
        console.log(chalk.green(`Config updated: ${username} <${email}>`));
    }

    hashObject(content) {
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }

    async add(fileToBeAdded) {
        if (!(await this.isTrackable(fileToBeAdded))) return;
        const fileData = await fs.readFile(fileToBeAdded, 'utf-8');
        const fileHash = this.hashObject(fileData);
        const newFilePath = path.join(this.objectsPath, fileHash);
        await fs.writeFile(newFilePath, fileData);
        await this.updateStagingArea(fileToBeAdded, fileHash);
        console.log(`Added ${fileToBeAdded}`);
    }

    async updateStagingArea(filePath, fileHash) {
        const index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
        const existing = index.find(file => file.path === filePath);
        if (existing) existing.hash = fileHash;
        else index.push({ path: filePath, hash: fileHash });
        await fs.writeFile(this.indexPath, JSON.stringify(index));
    }

    async reset(filePath) {
        const index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
        const updated = index.filter(entry => entry.path !== filePath);
        await fs.writeFile(this.indexPath, JSON.stringify(updated));
        console.log(`Unstaged ${filePath}`);
    }

    async commit(message) {
        const config = await this.loadConfig();
        const index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
        const parentCommit = await this.getCurrentHead();
        const commitData = {
            timeStamp: new Date().toISOString(),
            author: config.username || 'Anonymous',
            email: config.email || '',
            message,
            files: index,
            parent: parentCommit
        };
        const commitHash = this.hashObject(JSON.stringify(commitData));
        const commitPath = path.join(this.objectsPath, commitHash);
        await fs.writeFile(commitPath, JSON.stringify(commitData));
        await fs.writeFile(this.headPath, commitHash);
        await fs.writeFile(this.indexPath, JSON.stringify([]));
        console.log(chalk.green(`Commit Created: ${commitHash}`));
    }

    async getCurrentHead() {
        try {
            return await fs.readFile(this.headPath, 'utf-8');
        } catch {
            return null;
        }
    }

    async log() {
        let currentCommitHash = await this.getCurrentHead();
        while (currentCommitHash) {
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentCommitHash), 'utf-8'));
            console.log(`--------------------------`);
            console.log(`Commit: ${currentCommitHash}`);
            console.log(`Author: ${commitData.author} <${commitData.email}>`);
            console.log(`Date: ${commitData.timeStamp}`);
            console.log(`\n${commitData.message}\n`);
            currentCommitHash = commitData.parent;
        }
    }

    async status() {
        const filesInDir = (await fs.readdir('.', { withFileTypes: true }))
            .filter(f => f.isFile())
            .map(f => f.name)
            .filter(f => f !== 'surge.js' && f !== '.surge' && f !== '.surgeignore');

        const index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
        const tracked = new Map(index.map(file => [file.path, file.hash]));

        const modified = [];
        const untracked = [];

        for (const file of filesInDir) {
            if (!(await this.isTrackable(file))) continue;
            const content = await fs.readFile(file, 'utf-8');
            const hash = this.hashObject(content);

            if (tracked.has(file)) {
                if (tracked.get(file) !== hash) {
                    modified.push(file);
                }
            } else {
                untracked.push(file);
            }
        }

        console.log(chalk.blue("\nStaged Files:"));
        console.log(index.map(f => ` - ${f.path}`).join('\n') || ' - None');

        console.log(chalk.yellow("\nModified Files (not staged):"));
        console.log(modified.map(f => ` - ${f}`).join('\n') || ' - None');

        console.log(chalk.red("\nUntracked Files:"));
        console.log(untracked.map(f => ` - ${f}`).join('\n') || ' - None');

        console.log('');
    }

    async isTrackable(file) {
        if (!existsSync(this.ignorePath)) return true;
        const ignorePatterns = (await fs.readFile(this.ignorePath, 'utf-8')).split('\n').map(line => line.trim());
        return !ignorePatterns.includes(file);
    }

    async showCommitDiff(commitHash) {
        const commitData = JSON.parse(await this.getCommitData(commitHash));
        if (!commitData) return console.log("Commit not found");

        for (const file of commitData.files) {
            console.log(chalk.magenta(`\nFile: ${file.path}`));
            const fileContent = await this.getFileContent(file.hash);

            if (commitData.parent) {
                const parentCommitData = JSON.parse(await this.getCommitData(commitData.parent));
                const parentContent = await this.getParentFileContent(parentCommitData, file.path);

                if (parentContent !== undefined) {
                    const diff = diffLines(parentContent, fileContent);
                    diff.forEach(part => {
                        if (part.added) process.stdout.write(chalk.green('++' + part.value));
                        else if (part.removed) process.stdout.write(chalk.red('--' + part.value));
                        else process.stdout.write(chalk.grey(part.value));
                    });
                    console.log();
                } else {
                    console.log(chalk.green("New file in this commit"));
                }
            } else {
                console.log(chalk.green("First commit"));
            }
        }
    }

    async getParentFileContent(parentCommitData, filePath) {
        const parentFile = parentCommitData.files.find(file => file.path === filePath);
        if (parentFile) return await this.getFileContent(parentFile.hash);
    }

    async getCommitData(hash) {
        const commitPath = path.join(this.objectsPath, hash);
        try {
            return await fs.readFile(commitPath, 'utf-8');
        } catch {
            return null;
        }
    }

    async getFileContent(hash) {
        const filePath = path.join(this.objectsPath, hash);
        return fs.readFile(filePath, 'utf-8');
    }

    async createBranch(branchName) {
        const currentHead = await this.getCurrentHead();
        const branchPath = path.join(this.branchesPath, branchName);
        await fs.writeFile(branchPath, currentHead);
        console.log(chalk.green(`Branch '${branchName}' created`));
    }

    async checkoutBranch(branchName) {
        const branchPath = path.join(this.branchesPath, branchName);
        if (!existsSync(branchPath)) {
            console.log(chalk.red(`Branch '${branchName}' does not exist!`));
            return;
        }
        const branchHead = await fs.readFile(branchPath, 'utf-8');
        await fs.writeFile(this.headPath, branchHead);
        console.log(chalk.green(`Switched to branch '${branchName}'`));
    }

    async mergeBranch(branchName) {
        const currentHead = await this.getCurrentHead();
        const branchPath = path.join(this.branchesPath, branchName);
        if (!existsSync(branchPath)) {
            console.log(chalk.red(`Branch '${branchName}' does not exist!`));
            return;
        }
        const branchHead = await fs.readFile(branchPath, 'utf-8');
        // Merging logic can be added here, for now it's a placeholder
        console.log(chalk.green(`Merging branch '${branchName}' into current branch`));
        // Simple merge (just setting head to branchHead for simplicity)
        await fs.writeFile(this.headPath, branchHead);
    }
}

// CLI Commands

program.name('surge').description('A simple version control system').version('1.0.0');

program.command('init').description('Initialize a new surge repo').action(async () => {
    const surge = new Surge();
});

program.command('add <file>').description('Stage a file for commit').action(async (file) => {
    const surge = new Surge();
    await surge.add(file);
});

program.command('reset <file>').description('Unstage a file').action(async (file) => {
    const surge = new Surge();
    await surge.reset(file);
});

program.command('commit <message>').description('Create a commit with message').action(async (message) => {
    const surge = new Surge();
    await surge.commit(message);
});

program.command('log').description('View commit logs').action(async () => {
    const surge = new Surge();
    await surge.log();
});

program.command('status').description('Show current working directory status').action(async () => {
    const surge = new Surge();
    await surge.status();
});

program.command('config <username> <email>').description('Set your author name and email').action(async (username, email) => {
    const surge = new Surge();
    await surge.config(username, email);
});

program.command('show <commitHash>').description('Show diff of a specific commit').action(async (hash) => {
    const surge = new Surge();
    await surge.showCommitDiff(hash);
});

program.command('branch <branch-name>').description('Create a new branch').action(async (branchName) => {
    const surge = new Surge();
    await surge.createBranch(branchName);
});

program.command('checkout <branch-name>').description('Switch to a branch').action(async (branchName) => {
    const surge = new Surge();
    await surge.checkoutBranch(branchName);
});

program.command('merge <branch-name>').description('Merge a branch into the current branch').action(async (branchName) => {
    const surge = new Surge();
    await surge.mergeBranch(branchName);
});

program.parse(process.argv);
