#!/usr/bin/env bash
# 本地启动 nursery-api.jar（含临时 MySQL 3307）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MYSQL=/usr/local/mysql
BASE="$ROOT/.local-mysql"
DATADIR="$BASE/data"
SOCK="$BASE/mysql.sock"
PORT=3307
JAR="$ROOT/nursery-api/target/nursery-api-0.2.0-SNAPSHOT.jar"
if [[ ! -f "$JAR" ]]; then
  JAR="$ROOT/nursery-api/target/nursery-api.jar"
fi
if [[ ! -f "$JAR" ]]; then
  echo "找不到 JAR，请先 mvn package 或放入 target/" >&2
  exit 1
fi
JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home}"

mkdir -p "$DATADIR"
if [[ ! -d "$DATADIR/mysql" ]]; then
  "$MYSQL/bin/mysqld" --initialize-insecure --datadir="$DATADIR" --basedir="$MYSQL"
fi

if ! "$MYSQL/bin/mysqladmin" --socket="$SOCK" ping >/dev/null 2>&1; then
  echo "Starting MySQL on port $PORT ..."
  "$MYSQL/bin/mysqld" \
    --datadir="$DATADIR" \
    --basedir="$MYSQL" \
    --port="$PORT" \
    --bind-address=127.0.0.1 \
    --socket="$SOCK" \
    --pid-file="$BASE/mysqld.pid" \
    --skip-mysqlx &
  for i in {1..30}; do
    "$MYSQL/bin/mysqladmin" --socket="$SOCK" ping >/dev/null 2>&1 && break
    sleep 1
  done
fi

"$MYSQL/bin/mysql" --socket="$SOCK" -uroot -e "CREATE DATABASE IF NOT EXISTS nursery_db;" >/dev/null

OVERRIDE="$ROOT/nursery-api/application-local.override.yml"
mkdir -p "$ROOT/data"

echo "Starting Java API on http://127.0.0.1:8080/api ..."
echo "  data dir: $ROOT/data"
echo "  override: $OVERRIDE"
cd "$ROOT"
exec "$JAVA_HOME/bin/java" -jar "$JAR" \
  --spring.profiles.active=local \
  --spring.config.additional-location="file:${OVERRIDE}" \
  --nursery.data-dir="${ROOT}/data" \
  --spring.flyway.enabled=false \
  --spring.datasource.url="jdbc:mysql://127.0.0.1:${PORT}/nursery_db?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8&allowPublicKeyRetrieval=true" \
  --spring.datasource.username=root \
  --spring.datasource.password= \
  --spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
