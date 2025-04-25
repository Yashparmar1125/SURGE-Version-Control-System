import winston from 'winston';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export class Logger {
    constructor() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    async initialize(logPath) {
        if (!existsSync(path.dirname(logPath))) {
            await fs.mkdir(path.dirname(logPath), { recursive: true });
        }

        this.logger.add(new winston.transports.File({
            filename: logPath,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }));
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    error(message, error = null) {
        if (error) {
            this.logger.error(message, {
                error: error.message,
                stack: error.stack
            });
        } else {
            this.logger.error(message);
        }
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }
} 