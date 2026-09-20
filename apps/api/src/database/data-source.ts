import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { loadDatabaseConfig } from './config/database.config';
import { createDatabaseOptions } from './database.options';

export const AppDataSource = new DataSource(
  createDatabaseOptions(loadDatabaseConfig()),
);
