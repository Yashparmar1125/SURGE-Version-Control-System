import Database from "better-sqlite3";
import path from "path";
import { Logger } from "../utils/Logger.js";
import fs from "fs/promises";

export class SurgeDatabase {
  constructor(repoPath) {
    this.dbPath = path.join(repoPath, "surge.db");
    this.logger = new Logger();
    this.db = null;
  }

  async initialize() {
    try {
      // If already initialized, return
      if (this.db) {
        return true;
      }

      // Ensure the directory exists
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

      // Open the database
      this.db = new Database(this.dbPath);

      // Enable foreign keys
      this.db.pragma("foreign_keys = ON");

      // Create tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS commits (
          hash TEXT PRIMARY KEY,
          parent TEXT,
          author TEXT,
          email TEXT,
          message TEXT,
          timestamp INTEGER,
          tree TEXT
        );
        
        CREATE TABLE IF NOT EXISTS files (
          hash TEXT PRIMARY KEY,
          path TEXT,
          content BLOB,
          type TEXT,
          staged INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS objects (
          hash TEXT PRIMARY KEY,
          type TEXT,
          data TEXT
        );
        
        CREATE TABLE IF NOT EXISTS branches (
          name TEXT PRIMARY KEY,
          commit_hash TEXT
        );
        
        CREATE TABLE IF NOT EXISTS remotes (
          name TEXT PRIMARY KEY,
          url TEXT,
          fetch_spec TEXT
        );
        
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      this.logger.info("Database initialized successfully");
      return true;
    } catch (error) {
      this.logger.error("Failed to initialize database:", error);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async addCommit(commit) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare(
      "INSERT INTO commits (hash, parent, author, email, message, timestamp, tree) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      commit.hash,
      commit.parent,
      commit.author,
      commit.email,
      commit.message,
      commit.timestamp,
      commit.tree
    );
  }

  async addFile(file) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare(
      "INSERT INTO files (hash, path, content, type) VALUES (?, ?, ?, ?)"
    );
    stmt.run(file.hash, file.path, file.content, file.type);
  }

  async getCommit(hash) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("SELECT * FROM commits WHERE hash = ?");
    return stmt.get(hash);
  }

  async getFile(hash) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("SELECT * FROM files WHERE hash = ?");
    return stmt.get(hash);
  }

  async getBranch(name) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("SELECT * FROM branches WHERE name = ?");
    return stmt.get(name);
  }

  async updateBranch(name, commitHash) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO branches (name, commit_hash) VALUES (?, ?)"
    );
    stmt.run(name, commitHash);
  }

  async addRemote(
    name,
    url,
    fetchSpec = "+refs/heads/*:refs/remotes/origin/*"
  ) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO remotes (name, url, fetch_spec) VALUES (?, ?, ?)"
    );
    stmt.run(name, url, fetchSpec);
  }

  async getRemote(name) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("SELECT * FROM remotes WHERE name = ?");
    return stmt.get(name);
  }

  async setConfig(key, value) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)"
    );
    stmt.run(key, value);
  }

  async getConfig(key) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("SELECT value FROM config WHERE key = ?");
    const result = stmt.get(key);
    return result ? result.value : null;
  }

  async getFileInIndex(path) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("SELECT * FROM files WHERE path = ?");
    return stmt.get(path);
  }

  async getStagedFiles() {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("SELECT * FROM files WHERE staged = 1");
    return stmt.all();
  }

  async stageFile(file) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("UPDATE files SET staged = 1 WHERE path = ?");
    stmt.run(file.path);
  }

  async unstageFile(file) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("UPDATE files SET staged = 0 WHERE path = ?");
    stmt.run(file.path);
  }

  async clearStagingArea() {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("UPDATE files SET staged = 0");
    stmt.run();
  }

  async getHead() {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("SELECT value FROM config WHERE key = 'HEAD'");
    const result = stmt.get();
    return result ? result.value : null;
  }

  async updateHead(commitHash) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO config (key, value) VALUES ('HEAD', ?)"
    );
    stmt.run(commitHash);
  }

  async storeObject(hash, type, data) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO objects (hash, type, data) VALUES (?, ?, ?)"
    );
    stmt.run(hash, type, JSON.stringify(data));
  }

  async getObject(hash) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare("SELECT * FROM objects WHERE hash = ?");
    const result = stmt.get(hash);
    return result ? JSON.parse(result.data) : null;
  }
}
