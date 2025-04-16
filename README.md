# Surge VCS
A simple, intuitive version control system designed for non-developers.

## Overview
Surge VCS aims to make version control accessible to artists, writers, scientists, and anyone who needs to manage changes in their work without the complexity of traditional developer-focused tools.

## Features
- **Easy to Use**: Simple commands for adding, committing, and viewing changes.
- **Non-Developer Friendly**: Designed with a focus on usability for non-technical users.
- **SHA-1 Hashing**: Uses SHA-1 for content-addressed storage, ensuring data integrity.
- **SQLite Integration**: Stores metadata efficiently using SQLite for fast queries.

## Getting Started
1. **Install Node.js**: Ensure Node.js is installed on your system.
2. **Clone the Repository**: Clone this repository to your local machine.
3. **Run `node Surge.js init`**: Initialize a new Surge VCS repository.
4. **Add Files**: Use `node Surge.js add <file>` to track changes.
5. **Commit Changes**: Use `node Surge.js commit "<message>"` to save versions.

## Commands
- **`init`**: Initializes a new Surge VCS repository.
- **`add <file>`**: Adds a file to version control.
- **`commit <message>`**: Commits changes with a meaningful message.
- **`log`**: Displays a log of all commits.
- **`show <commitHash>`**: Shows details and diffs for a specific commit.

## Contributing
Contributions are welcome! Please submit pull requests with clear descriptions of changes.

## License
[Insert License Information Here]
