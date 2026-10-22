#!/usr/bin/env bash
# Roda migração, seeds e testes do banco num PostgreSQL descartável.
# Uso: DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db
# O banco indicado é APAGADO e recriado como "simula_teste".
set -euo pipefail

base="${DATABASE_URL:?Defina DATABASE_URL apontando para um PostgreSQL local}"
dir="$(cd "$(dirname "$0")/.." && pwd)"

psql "$base" -qc "drop database if exists simula_teste" -c "create database simula_teste"
url="${base%/*}/simula_teste"

run() { psql "$url" -q -v ON_ERROR_STOP=1 -f "$1"; }
run "$dir/supabase/tests/auth_stub.sql"
run "$dir/supabase/migrations/0001_schema_inicial.sql"
run "$dir/supabase/seed.sql"
run "$dir/supabase/seed_demo.sql"
run "$dir/supabase/tests/regras_de_negocio.sql"
