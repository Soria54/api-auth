import { afterEach, describe, expect, it, vi } from 'vitest';
import { lireConfigBase } from '../../../config/database.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('config/database', () => {
  it('refuse un dialecte inconnu', () => {
    vi.stubEnv('DB_DIALECT', 'oracle');
    expect(() => lireConfigBase()).toThrow(/DB_DIALECT inconnu/);
  });

  it('sqlite : fichier ou mémoire', () => {
    vi.stubEnv('DB_DIALECT', 'sqlite');
    vi.stubEnv('DB_STORAGE', '');
    expect(lireConfigBase().storage).toBe(':memory:');
  });

  it('postgres : port par défaut et compte applicatif', () => {
    vi.stubEnv('DB_DIALECT', 'postgres');
    vi.stubEnv('DB_PORT', '');
    vi.stubEnv('DB_USER', 'appli');
    const config = lireConfigBase();
    expect(config.port).toBe(5432);
    expect(config.username).toBe('appli');
    expect(config.dialectOptions).toEqual({});
  });

  it('compte de migration prioritaire en mode migration', () => {
    vi.stubEnv('DB_DIALECT', 'postgres');
    vi.stubEnv('DB_USER', 'appli');
    vi.stubEnv('MIGRATION_USER', 'ddl');
    expect(lireConfigBase({ migration: true }).username).toBe('ddl');
    expect(lireConfigBase().username).toBe('appli');
  });

  it('mssql : options de chiffrement et pool de production', () => {
    vi.stubEnv('DB_DIALECT', 'mssql');
    vi.stubEnv('DB_ENCRYPT', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    const config = lireConfigBase();
    expect(config.port).toBe(1433);
    expect(config.pool.max).toBe(20);
    expect(config.dialectOptions.options.encrypt).toBe(true);
  });
});
