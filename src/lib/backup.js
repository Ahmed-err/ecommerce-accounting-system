import Cursor from "pg-cursor";
import pg from "pg";

// Builds the database backup file (JSON or SQL) from a pg client. `write(text)` receives the
// file in pieces, so large tables stream instead of sitting in memory.

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, "\"\"")}"`;
}

function safeJsonStringify(value) {
  return JSON.stringify(value, (_key, v) => {
    if (typeof v === "bigint") return v.toString();
    return v;
  });
}

function sqlStringLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Dates and times are copied exactly as stored. Parsed into JS Dates they would be read in the
// server's time zone and written back shifted (timestamp columns have no zone).
const RAW_TYPES = new Set([1082, 1083, 1114, 1184, 1266]); // date, time, timestamp, timestamptz, timetz
const cursorConfig = {
  types: { getTypeParser: (oid, format) => (RAW_TYPES.has(oid) ? (v) => v : pg.types.getTypeParser(oid, format)) },
};

function readCursor(cursor, size = 200) {
  return new Promise((resolve, reject) => {
    cursor.read(size, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function closeCursor(cursor) {
  return new Promise((resolve) => {
    cursor.close(() => resolve());
  });
}

async function getPublicTables(client) {
  const result = await client.query(`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('_prisma_migrations')
    ORDER BY tablename ASC
  `);
  return result.rows.map((r) => r.tablename).filter(Boolean);
}

/** Foreign keys between public tables: [{ child, parent, column, parentColumn }] (single-column). */
async function getForeignKeys(client) {
  const result = await client.query(`
    SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent,
           a.attname AS column, pa.attname AS "parentColumn"
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace AND n.nspname = 'public'
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_attribute pa ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f' AND array_length(c.conkey, 1) = 1
  `);
  const bare = (name) => name.replace(/^public\./, "").replace(/^"|"$/g, "");
  return result.rows.map((r) => ({ ...r, child: bare(r.child), parent: bare(r.parent) }));
}

/**
 * Tables ordered so every table comes after the tables it points to (Postgres checks each
 * insert's foreign keys, so loading "Order" before "User" fails). Exported for tests.
 */
export function orderByDependencies(tables, foreignKeys) {
  const parents = new Map(tables.map((t) => [t, new Set()]));
  for (const fk of foreignKeys) {
    if (fk.child !== fk.parent && parents.has(fk.child) && parents.has(fk.parent)) parents.get(fk.child).add(fk.parent);
  }
  const ordered = [];
  const done = new Set();
  let progress = true;
  while (ordered.length < tables.length && progress) {
    progress = false;
    for (const t of tables) {
      if (done.has(t) || [...parents.get(t)].some((p) => !done.has(p))) continue;
      ordered.push(t);
      done.add(t);
      progress = true;
    }
  }
  // A cycle between tables (none today) keeps its alphabetical place at the end.
  return [...ordered, ...tables.filter((t) => !done.has(t))];
}

/** SELECT for a table's rows; a table pointing to itself (Category) lists parents first. */
function selectRows(tableName, foreignKeys) {
  const tableSql = `${quoteIdent("public")}.${quoteIdent(tableName)}`;
  const self = foreignKeys.find((fk) => fk.child === tableName && fk.parent === tableName);
  if (!self) return `SELECT * FROM ${tableSql}`;
  const col = quoteIdent(self.column);
  const key = quoteIdent(self.parentColumn);
  return `WITH RECURSIVE tree AS (
    SELECT t.*, 0 AS backup_depth FROM ${tableSql} t WHERE t.${col} IS NULL
    UNION ALL
    SELECT c.*, tree.backup_depth + 1 FROM ${tableSql} c JOIN tree ON c.${col} = tree.${key}
  )
  SELECT * FROM tree ORDER BY backup_depth`;
}

async function streamJsonBackup(client, write, tableNames) {
  const meta = {
    format: "json-stream",
    generatedAt: new Date().toISOString(),
    tableCount: tableNames.length,
    tables: tableNames,
  };

  await write(`{"meta":${safeJsonStringify(meta)},"data":{`);

  for (let i = 0; i < tableNames.length; i += 1) {
    const tableName = tableNames[i];
    const tableSql = `${quoteIdent("public")}.${quoteIdent(tableName)}`;
    const cursor = client.query(new Cursor(`SELECT * FROM ${tableSql}`, null, cursorConfig));
    let firstRow = true;

    await write(`${i > 0 ? "," : ""}${safeJsonStringify(tableName)}:[`);
    try {
      while (true) {
        const rows = await readCursor(cursor, 200);
        if (rows.length === 0) break;

        for (const row of rows) {
          await write(`${firstRow ? "" : ","}${safeJsonStringify(row)}`);
          firstRow = false;
        }
      }
    } finally {
      await closeCursor(cursor);
    }
    await write("]");
  }

  await write("}}");
}

async function streamSqlBackup(client, write, tableNames, foreignKeys) {
  await write(`-- SQL backup generated by app\n-- ${new Date().toISOString()}\nBEGIN;\nSET statement_timeout = 0;\nSET lock_timeout = 0;\n`
  );

  for (const tableName of tableNames) {
    const tableSql = `${quoteIdent("public")}.${quoteIdent(tableName)}`;
    await write(`TRUNCATE TABLE ${tableSql} RESTART IDENTITY CASCADE;\n`);
  }

  for (const tableName of tableNames) {
    const tableSql = `${quoteIdent("public")}.${quoteIdent(tableName)}`;
    const cursor = client.query(new Cursor(selectRows(tableName, foreignKeys), null, cursorConfig));

    try {
      while (true) {
        const rows = (await readCursor(cursor, 100)).map(({ backup_depth: _depth, ...row }) => row);
        if (rows.length === 0) break;

        const jsonBatch = safeJsonStringify(rows);
        await write(`INSERT INTO ${tableSql} SELECT * FROM json_populate_recordset(NULL::${tableSql}, ${sqlStringLiteral(jsonBatch)}::json);\n`
        );
      }
    } finally {
      await closeCursor(cursor);
    }
  }

  await write("COMMIT;\n");
}

/** Writes the whole backup in `format` ("sql" or "json") through `write`. */
export async function writeBackup(client, format, write) {
  const foreignKeys = await getForeignKeys(client);
  const tableNames = orderByDependencies(await getPublicTables(client), foreignKeys);
  if (format === "sql") await streamSqlBackup(client, write, tableNames, foreignKeys);
  else await streamJsonBackup(client, write, tableNames);
}

export { safeJsonStringify };
