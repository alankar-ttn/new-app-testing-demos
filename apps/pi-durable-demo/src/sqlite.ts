import { Database, type Statement } from "bun:sqlite"
import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import {
  SqliteStorage,
  type SqliteDatabase,
  type SqliteExecutor,
  type SqliteValue,
} from "@earendil-works/pi-durable/storage/sqlite"

const ignore = () => {}

class SerialOperationQueue {
  private tail: Promise<void> = Promise.resolve()
  private pending = 0

  run<T>(operation: () => T): Promise<T> {
    if (this.pending > 0) return this.enqueue(operation)
    try {
      return Promise.resolve(operation())
    } catch (error) {
      return Promise.reject(error)
    }
  }

  runAsync<T>(operation: () => Promise<T>): Promise<T> {
    if (this.pending > 0) return this.enqueue(operation)
    this.pending += 1
    const { promise: barrier, resolve: releaseBarrier } = Promise.withResolvers<void>()
    this.tail = barrier
    let started: Promise<T>
    try {
      started = operation()
    } catch (error) {
      started = Promise.reject(error)
    }
    return started.finally(() => {
      this.pending -= 1
      releaseBarrier()
    })
  }

  private enqueue<T>(operation: () => T | Promise<T>): Promise<T> {
    this.pending += 1
    return this.release(this.tail.then(operation))
  }

  private release<T>(operation: Promise<T>): Promise<T> {
    const settled = operation.finally(() => {
      this.pending -= 1
    })
    this.tail = settled.then(ignore, ignore)
    return settled
  }
}

class BunSqliteExecutor implements SqliteExecutor {
  constructor(
    protected readonly database: Database,
    protected readonly statements: Map<string, Statement>,
  ) {}

  exec(sql: string): Promise<void> {
    return this.runOperation(() => {
      this.database.exec(sql)
    })
  }

  run(sql: string, ...params: SqliteValue[]): Promise<void> {
    return this.runOperation(() => {
      this.statement(sql).run(...params)
    })
  }

  get<T>(sql: string, ...params: SqliteValue[]): Promise<T | undefined> {
    return this.runOperation(() => {
      const row = this.statement(sql).get(...params) as T | null
      return row ?? undefined
    })
  }

  all<T>(sql: string, ...params: SqliteValue[]): Promise<T[]> {
    return this.runOperation(() => this.statement(sql).all(...params) as T[])
  }

  protected runOperation<T>(_operation: () => T): Promise<T> {
    throw new Error("runOperation must be implemented")
  }

  private statement(sql: string): Statement {
    let statement = this.statements.get(sql)
    if (statement === undefined) {
      statement = this.database.prepare(sql)
      this.statements.set(sql, statement)
    }
    return statement
  }
}

class BunSqliteTransaction extends BunSqliteExecutor {
  constructor(
    database: Database,
    statements: Map<string, Statement>,
    private readonly scope: { active: boolean },
  ) {
    super(database, statements)
  }

  protected override async runOperation<T>(operation: () => T): Promise<T> {
    if (!this.scope.active) throw new Error("SQLite transaction handle is no longer active")
    return operation()
  }
}

class BunSqliteDatabase extends BunSqliteExecutor implements SqliteDatabase {
  private readonly access = new SerialOperationQueue()
  private closed = false

  constructor(database: Database) {
    super(database, new Map())
  }

  transaction<T>(callback: (transaction: SqliteExecutor) => Promise<T>): Promise<T> {
    return this.access.runAsync(async () => {
      this.database.exec("BEGIN IMMEDIATE")
      const scope = { active: true }
      try {
        const result = await callback(new BunSqliteTransaction(this.database, this.statements, scope))
        scope.active = false
        this.database.exec("COMMIT")
        return result
      } catch (error) {
        scope.active = false
        try {
          this.database.exec("ROLLBACK")
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            "SQLite transaction failed and rollback failed",
          )
        }
        throw error
      }
    })
  }

  close(): Promise<void> {
    return this.access.run(() => {
      if (this.closed) return
      this.closed = true
      this.statements.clear()
      try {
        this.database.exec("PRAGMA wal_checkpoint(TRUNCATE)")
      } finally {
        this.database.close()
      }
    })
  }

  protected override runOperation<T>(operation: () => T): Promise<T> {
    return this.access.run(operation)
  }
}

/** Open file-backed Pi Durable storage on Bun's synchronous SQLite. */
export async function openBunSqliteStorage(path: string): Promise<SqliteStorage> {
  if (path !== ":memory:") await mkdir(dirname(path), { recursive: true })
  const database = new Database(path, { create: true })
  const adapter = new BunSqliteDatabase(database)
  try {
    await adapter.exec("PRAGMA journal_mode = WAL")
    await adapter.exec("PRAGMA synchronous = NORMAL")
    await adapter.exec("PRAGMA wal_autocheckpoint = 1000")
    await adapter.exec("PRAGMA busy_timeout = 5000")
    return SqliteStorage.open(adapter)
  } catch (error) {
    try {
      await adapter.close()
    } catch {
      // Preserve the configuration failure.
    }
    throw error
  }
}
