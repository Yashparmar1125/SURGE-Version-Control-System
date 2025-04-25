import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import crypto from "crypto";
import { SurgeDatabase } from "../services/Database.js";
import { Logger } from "../utils/Logger.js";
import { FileLock } from "../utils/FileLock.js";
import { ConflictResolver } from "../services/ConflictResolver.js";
import { RemoteManager } from "../services/RemoteManager.js";

export class Repository {
  constructor(repoPath = ".") {
    this.repoPath = path.resolve(repoPath);
    this.workTree = this.repoPath;
    this.surgePath = path.join(this.repoPath, ".surge");
    this.objectsPath = path.join(this.surgePath, "objects");
    this.headPath = path.join(this.surgePath, "HEAD");
    this.indexPath = path.join(this.surgePath, "index");
    this.configPath = path.join(this.surgePath, "config.json");
    this.ignorePath = path.join(this.surgePath, ".surgeignore");
    this.branchesPath = path.join(this.surgePath, "refs/heads");
    this.remotesPath = path.join(this.surgePath, "refs/remotes");

    this.db = new SurgeDatabase(this.surgePath);
    this.logger = new Logger();
    this.fileLock = new FileLock();
    this.conflictResolver = new ConflictResolver();
    this.remoteManager = new RemoteManager(this);
    this._ignorePatterns = null;
  }

  isInitialized() {
    return (
      existsSync(this.surgePath) &&
      existsSync(this.objectsPath) &&
      existsSync(this.headPath) &&
      existsSync(this.indexPath) &&
      existsSync(this.configPath)
    );
  }

  async updateBranch(name, commitHash) {
    try {
      await this.fileLock.acquire();
      await this.db.updateBranch(name, commitHash);

      // Also update the branch file
      const branchPath = path.join(this.branchesPath, name);
      await fs.mkdir(path.dirname(branchPath), { recursive: true });
      await fs.writeFile(branchPath, commitHash || "");

      this.logger.info(`Updated branch '${name}' to ${commitHash || "null"}`);
    } catch (error) {
      this.logger.error(`Failed to update branch '${name}'`, error);
      throw error;
    } finally {
      await this.fileLock.release();
    }
  }

  async init() {
    try {
      // Create all necessary directories
      await fs.mkdir(this.surgePath, { recursive: true });
      await fs.mkdir(this.objectsPath, { recursive: true });
      await fs.mkdir(this.branchesPath, { recursive: true });
      await fs.mkdir(this.remotesPath, { recursive: true });

      // Initialize files
      if (!existsSync(this.headPath)) {
        await fs.writeFile(this.headPath, "ref: refs/heads/main");
      }
      if (!existsSync(this.indexPath)) {
        await fs.writeFile(this.indexPath, JSON.stringify([]));
      }
      if (!existsSync(this.configPath)) {
        await fs.writeFile(
          this.configPath,
          JSON.stringify({
            core: {
              repositoryformatversion: 0,
              filemode: true,
              bare: false,
            },
          })
        );
      }
      if (!existsSync(this.ignorePath)) {
        // Create default .surgeignore with common exclusions
        await fs.writeFile(
          this.ignorePath,
          `# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build outputs
dist/
build/
out/

# Environment files
.env
.env.local
.env.*.local

# IDE files
.idea/
.vscode/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Test coverage
coverage/

# Temporary files
*.tmp
*.bak
*.swp
*.swo

# Surge specific
.surge/
surge.db
`
        );
      }

      // Initialize database
      await this.db.initialize();

      // Create initial branch
      await this.updateBranch("main", null);

      this.logger.info("Initialized empty Surge repository");
      return true;
    } catch (error) {
      this.logger.error("Failed to initialize repository:", error);
      throw error;
    }
  }

  async updateStagingArea(file, fileHash) {
    try {
      const index = await this.loadIndex();
      const relativePath = path.relative(this.workTree, file);

      // Remove any existing entry for this file
      const newIndex = index.filter((item) => item.path !== relativePath);

      // Add the new entry
      newIndex.push({
        path: relativePath,
        hash: fileHash,
        timestamp: Date.now(),
      });

      // Save the updated index
      await fs.writeFile(this.indexPath, JSON.stringify(newIndex, null, 2));

      // Also update the database
      await this.db.addFile({
        hash: fileHash,
        path: relativePath,
        content: await fs.readFile(file, "utf-8"),
        type: "blob",
      });
    } catch (error) {
      this.logger.error(`Failed to update staging area for ${file}:`, error);
      throw error;
    }
  }

  async add(files) {
    try {
      await this.fileLock.acquire();

      // Initialize database if not already initialized
      if (!this.db.db) {
        await this.db.initialize();
      }

      for (const file of files) {
        const absolutePath = path.resolve(file);
        const relativePath = path.relative(this.workTree, absolutePath);

        if (!(await this.isTrackable(relativePath))) {
          this.logger.debug(`Skipping ignored file: ${relativePath}`);
          continue;
        }

        const fileData = await fs.readFile(absolutePath, "utf-8");
        const fileHash = this.hashObject(fileData);

        // Store file in database
        await this.db.addFile({
          hash: fileHash,
          path: relativePath,
          content: fileData,
          type: "blob",
        });

        // Mark file as staged
        await this.db.stageFile({ path: relativePath });

        this.logger.info(`Added ${relativePath}`);
      }
    } catch (error) {
      this.logger.error("Failed to add files", error);
      throw error;
    } finally {
      await this.fileLock.release();
    }
  }

  async commit(message, author) {
    try {
      // Initialize database if not already initialized
      if (!this.db.db) {
        await this.db.initialize();
      }

      // Get staged files
      const stagedFiles = await this.db.getStagedFiles();
      if (stagedFiles.length === 0) {
        throw new Error("No files staged for commit");
      }

      // Create tree object
      const treeHash = await this.createTree(stagedFiles);

      // Get current head
      const currentHead = await this.db.getHead();

      // Create commit object
      const commitData = {
        tree: treeHash,
        parent: currentHead,
        author: author || "Anonymous",
        message: message,
        timestamp: new Date().toISOString(),
      };

      // Calculate commit hash
      const commitHash = await this.calculateObjectHash(commitData);

      // Store commit object
      await this.db.storeObject(commitHash, "commit", commitData);

      // Update head
      await this.db.updateHead(commitHash);

      // Clear staging area
      await this.db.clearStagingArea();

      this.logger.info(`Created commit ${commitHash.substring(0, 7)}`);
      return commitHash;
    } catch (error) {
      this.logger.error("Failed to create commit", error);
      throw error;
    }
  }

  async merge(branchName) {
    try {
      await this.fileLock.acquire();

      const currentHead = await this.getCurrentHead();
      const branchHead = await this.getBranchHead(branchName);

      if (!branchHead) {
        throw new Error(`Branch '${branchName}' not found`);
      }

      const conflicts = await this.conflictResolver.findConflicts(
        currentHead,
        branchHead
      );

      if (conflicts.length > 0) {
        await this.conflictResolver.resolveConflicts(conflicts);
      }

      // Create merge commit
      const mergeCommit = await this.commit(
        `Merge branch '${branchName}'`,
        null,
        [currentHead, branchHead]
      );

      this.logger.info(`Successfully merged branch '${branchName}'`);
      return mergeCommit;
    } catch (error) {
      this.logger.error("Failed to merge branch", error);
      throw error;
    } finally {
      await this.fileLock.release();
    }
  }

  async getStatus() {
    try {
      // Initialize database if not already initialized
      if (!this.db.db) {
        await this.db.initialize();
      }

      const staged = [];
      const modified = [];
      const untracked = [];

      // Get all files in the working directory
      const files = await this.getAllFiles(this.workTree);

      // Process files in batches to avoid EMFILE errors
      const batchSize = 100;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        for (const file of batch) {
          const relativePath = path.relative(this.workTree, file);

          // Skip ignored files
          if (!(await this.isTrackable(relativePath))) {
            continue;
          }

          // Check if file is in the index
          const inIndex = await this.db.getFileInIndex(relativePath);

          if (inIndex) {
            // Check if file is modified
            const indexHash = inIndex.hash;
            const currentHash = await this.calculateFileHash(file);

            if (indexHash !== currentHash) {
              modified.push(relativePath);
            } else {
              staged.push(relativePath);
            }
          } else {
            untracked.push(relativePath);
          }
        }
      }

      return {
        staged,
        modified,
        untracked,
      };
    } catch (error) {
      this.logger.error("Failed to get status", error);
      throw error;
    }
  }

  async getCurrentBranch() {
    try {
      const headContent = await fs.readFile(this.headPath, "utf-8");
      if (headContent.startsWith("ref: ")) {
        return headContent.substring(5).split("/").pop();
      }
      return "detached HEAD";
    } catch {
      return "main";
    }
  }

  async getAllFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== ".surge") {
          files.push(...(await this.getAllFiles(fullPath)));
        }
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  // Helper methods
  hashObject(content) {
    return crypto.createHash("sha1").update(content, "utf-8").digest("hex");
  }

  async loadConfig() {
    if (!existsSync(this.configPath)) return {};
    const data = await fs.readFile(this.configPath, "utf-8");
    return JSON.parse(data || "{}");
  }

  async loadIndex() {
    if (!existsSync(this.indexPath)) return [];
    const data = await fs.readFile(this.indexPath, "utf-8");
    return JSON.parse(data || "[]");
  }

  async getCurrentHead() {
    try {
      return await fs.readFile(this.headPath, "utf-8");
    } catch {
      return null;
    }
  }

  async getBranchHead(branchName) {
    const branchPath = path.join(this.branchesPath, branchName);
    try {
      return await fs.readFile(branchPath, "utf-8");
    } catch {
      return null;
    }
  }

  async isTrackable(file) {
    try {
      // Initialize ignore patterns if not already done
      if (!this._ignorePatterns) {
        if (existsSync(this.ignorePath)) {
          const content = await fs.readFile(this.ignorePath, "utf-8");
          this._ignorePatterns = content
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("#"));
          this.logger.debug(
            `Loaded ${this._ignorePatterns.length} ignore patterns from .surgeignore`
          );
        } else {
          this._ignorePatterns = [];
          this.logger.debug("No .surgeignore file found, using empty patterns");
        }
      }

      // Check if file matches any ignore pattern
      const isIgnored = this._ignorePatterns.some((pattern) => {
        // Handle directory patterns (ending with /)
        if (pattern.endsWith("/")) {
          const dirPattern = pattern.slice(0, -1);
          return file.startsWith(dirPattern) || file.includes("/" + dirPattern);
        }

        // Handle negated patterns (starting with !)
        if (pattern.startsWith("!")) {
          return file === pattern.substring(1);
        }

        // Handle wildcard patterns
        if (pattern.includes("*")) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          return regex.test(file);
        }

        // Exact match
        return file === pattern;
      });

      if (isIgnored) {
        this.logger.debug(`File ${file} is ignored by .surgeignore`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to check if file is trackable: ${file}`, error);
      return true; // Default to trackable if there's an error
    }
  }

  async calculateFileHash(file) {
    const fileData = await fs.readFile(file, "utf-8");
    return this.hashObject(fileData);
  }

  async createTree(stagedFiles) {
    try {
      // Group files by directory
      const directories = {};
      for (const file of stagedFiles) {
        const dirname = path.dirname(file.path);
        if (!directories[dirname]) {
          directories[dirname] = [];
        }
        directories[dirname].push(file);
      }

      // Create tree objects for each directory
      const trees = {};
      for (const [dirname, files] of Object.entries(directories)) {
        const treeEntries = files.map((file) => ({
          path: path.basename(file.path),
          hash: file.hash,
          type: file.type,
          mode: "100644", // Regular file mode
        }));

        // Sort entries by path for consistent hashing
        treeEntries.sort((a, b) => a.path.localeCompare(b.path));

        // Create and store tree object
        const treeHash = await this.calculateObjectHash(treeEntries);
        await this.db.storeObject(treeHash, "tree", treeEntries);
        trees[dirname] = treeHash;
      }

      // Create root tree
      const rootEntries = [];
      for (const [dirname, hash] of Object.entries(trees)) {
        if (dirname === ".") {
          // Add files in root directory directly
          const treeObj = await this.db.getObject(hash);
          rootEntries.push(...treeObj);
        } else {
          // Add subdirectories
          rootEntries.push({
            path: dirname,
            hash: hash,
            type: "tree",
            mode: "040000", // Directory mode
          });
        }
      }

      // Sort root entries
      rootEntries.sort((a, b) => a.path.localeCompare(b.path));

      // Create and store root tree
      const rootHash = await this.calculateObjectHash(rootEntries);
      await this.db.storeObject(rootHash, "tree", rootEntries);

      return rootHash;
    } catch (error) {
      this.logger.error("Failed to create tree", error);
      throw error;
    }
  }

  async calculateObjectHash(data) {
    const content = JSON.stringify(data);
    return crypto.createHash("sha1").update(content).digest("hex");
  }
}
