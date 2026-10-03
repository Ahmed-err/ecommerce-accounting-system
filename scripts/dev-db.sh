#!/usr/bin/env sh
# Local Postgres for development: a user-owned cluster in .dev/pg, TCP only.
# Usage: sh scripts/dev-db.sh start|stop|status|reset
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DATA="$ROOT/.dev/pg"
LOG="$ROOT/.dev/pg.log"
PORT="${DEV_DB_PORT:-55432}"
DBS="store_dev store_test"

find_bin() {
  if [ -n "${PG_BIN:-}" ]; then echo "$PG_BIN"; return; fi
  latest=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -t/ -k5 -n | tail -1 || true)
  if [ -n "$latest" ]; then echo "$latest"; return; fi
  if command -v pg_ctl >/dev/null 2>&1; then dirname "$(command -v pg_ctl)"; fi
}

BIN=$(find_bin)
if [ -z "$BIN" ] || [ ! -x "$BIN/pg_ctl" ] || [ ! -x "$BIN/initdb" ]; then
  echo "dev-db: PostgreSQL server binaries not found. Install them (e.g. 'sudo apt install postgresql') or set PG_BIN." >&2
  exit 1
fi
psql_q() { "$BIN/psql" -h localhost -p "$PORT" -U postgres -d postgres -tAc "$1"; }

is_running() { "$BIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; }

start() {
  mkdir -p "$ROOT/.dev"
  if [ ! -f "$DATA/PG_VERSION" ]; then
    "$BIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
    echo "dev-db: initialised cluster in .dev/pg"
  fi
  if is_running; then
    echo "dev-db: already running on port $PORT"
  else
    if "$BIN/pg_isready" -h localhost -p "$PORT" >/dev/null 2>&1; then
      echo "dev-db: port $PORT is used by another server. Stop it or set DEV_DB_PORT." >&2
      exit 1
    fi
    "$BIN/pg_ctl" -D "$DATA" -l "$LOG" -w -o "-p $PORT -k '' -c listen_addresses=localhost" start >/dev/null
    echo "dev-db: started on port $PORT"
  fi
  for db in $DBS; do
    if [ "$(psql_q "select 1 from pg_database where datname='$db'")" != "1" ]; then
      psql_q "create database $db" >/dev/null
      echo "dev-db: created database $db"
    fi
  done
}

stop() {
  if is_running; then "$BIN/pg_ctl" -D "$DATA" -m fast stop >/dev/null; echo "dev-db: stopped"; else echo "dev-db: not running"; fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  status) if is_running; then echo "dev-db: running on port $PORT"; else echo "dev-db: not running"; exit 1; fi ;;
  reset) stop; rm -rf "$DATA"; start ;;
  *) echo "usage: sh scripts/dev-db.sh start|stop|status|reset" >&2; exit 2 ;;
esac
