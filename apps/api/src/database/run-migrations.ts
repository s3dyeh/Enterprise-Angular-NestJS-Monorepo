import { AppDataSource } from './data-source';

async function migrate() {
  await AppDataSource.initialize();
  const lock = AppDataSource.createQueryRunner();
  try {
    await lock.connect();
    // One migrator across Jenkins jobs and operators, even when API replicas keep running.
    const rows: { acquired: boolean }[] = await lock.query(
      'SELECT pg_try_advisory_lock(19001901) AS acquired',
    );
    if (!rows[0].acquired)
      throw new Error('Another schema migration is running');
    try {
      await AppDataSource.runMigrations({ transaction: 'all' });
    } finally {
      await lock.query('SELECT pg_advisory_unlock(19001901)');
    }
  } finally {
    await lock.release();
    await AppDataSource.destroy();
  }
}
void migrate().catch(() => {
  console.error(
    'Migration failed; review database health and migration compatibility.',
  );
  process.exitCode = 1;
});
