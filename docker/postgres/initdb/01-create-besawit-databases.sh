#!/bin/sh
set -eu

create_db_if_missing() {
  db_name="$1"
  exists="$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}'")"
  if [ "$exists" != "1" ]; then
    createdb --username "$POSTGRES_USER" "$db_name"
  fi
}

create_db_if_missing "besawit_app"
create_db_if_missing "besawit_control"
