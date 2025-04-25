#!/usr/bin/env node

import { Command } from "commander";
import { commands } from "./commands/index.js";

const program = new Command();

program
  .name("surge")
  .description("A modern, user-friendly version control system")
  .version("1.0.0");

// Initialize a new repository
program
  .command("init [directory]")
  .description("Initialize a new Surge repository")
  .action(commands.init);

// Add files to staging
program
  .command("add <files...>")
  .description("Add files to staging")
  .action(commands.add);

// Commit changes
program
  .command("commit")
  .description("Commit staged changes")
  .option("-m, --message <message>", "Commit message")
  .action(commands.commit);

// View commit history
program.command("log").description("Show commit history").action(commands.log);

// Show commit details
program
  .command("show [commit]")
  .description("Show commit details")
  .option("--stat", "Show file statistics")
  .option("--patch", "Show patch information")
  .action(commands.show);

// Check repository status
program
  .command("status")
  .description("Show repository status")
  .action(commands.status);

// Branch management
program
  .command("branch [name]")
  .description("List, create, or delete branches")
  .option("-d, --delete", "Delete a branch")
  .action(commands.branch);

// Checkout branch or commit
program
  .command("checkout <target>")
  .description("Switch branches or restore working tree files")
  .option("-f, --file", "Restore file from index")
  .action(commands.checkout);

// Merge branches
program
  .command("merge <branch>")
  .description("Merge changes from another branch")
  .option("--auto-resolve", "Automatically resolve conflicts")
  .action(commands.merge);

// Rebase commits
program
  .command("rebase <branch>")
  .description("Rebase commits onto another branch")
  .option("-i, --interactive", "Interactive rebase")
  .option("--auto-resolve", "Automatically resolve conflicts")
  .action(commands.rebase);

// Configure repository
program
  .command("config [key] [value]")
  .description("Configure repository settings")
  .option("--unset", "Remove configuration")
  .action(commands.config);

// Push changes to remote
program
  .command("push [remote] [branch]")
  .description("Push changes to remote repository")
  .action(commands.push);

// Pull changes from remote
program
  .command("pull [remote] [branch]")
  .description("Pull changes from remote repository")
  .option("--auto-resolve", "Automatically resolve conflicts")
  .action(commands.pull);

// Clone repository
program
  .command("clone <url> [directory]")
  .description("Clone a repository")
  .action(commands.clone);

// Show changes between commits
program
  .command("diff [commit1] [commit2]")
  .description("Show changes between commits")
  .option("--stat", "Show file statistics")
  .option("--patch", "Show patch information")
  .action(commands.diff);

// Reset changes
program
  .command("reset [commit]")
  .description("Reset changes")
  .option("--hard", "Hard reset")
  .option("--mixed", "Mixed reset")
  .option("--soft", "Soft reset")
  .action(commands.reset);

// Stash changes
program
  .command("stash [message]")
  .description("Stash changes")
  .option("--list", "List stashes")
  .option("--pop", "Pop stash")
  .option("--apply", "Apply stash")
  .option("--drop", "Drop stash")
  .action(commands.stash);

// Manage tags
program
  .command("tag [name] [commit]")
  .description("Manage tags")
  .option("-d, --delete", "Delete tag")
  .action(commands.tag);

// Parse command line arguments
program.parse(process.argv);
