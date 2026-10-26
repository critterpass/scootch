/** A value SQLite stores for the board: text, a number or nothing. */
export type SqlValue = string | number | null;

/** The part of an expo-sqlite database the board's repositories use. */
export interface DataDatabase {
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
