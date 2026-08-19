# FloatChat — hosted DB load order (Supabase Postgres, PostGIS enabled)
#
# 1. In Supabase SQL editor, first run:
#       create extension if not exists postgis;
# 2. Then run the schema:  data/floatchat_schema_deploy.sql
# 3. Then load data:  data/floatchat_data.sql   (pg_dump COPY format, run via psql)
# 4. Create a read-only pooler user for the app in Supabase dashboard
#    (Database → Roles), grant SELECT on all tables, and put its credentials in
#    backend/.env (or Render/Railway env vars) as DB_USER / DB_PASSWORD.
#
# Read-only enforcement (ARCHITECTURE.md §2.4): the app connects as that
# SELECT-only user; the guardrail layer is the first line, the DB role is the
# second. Do not point the deployed app at the postgres/owner role.
#
# The data dump (floatchat_data.sql) was produced with:
#   pg_dump --data-only -t public.argo_floats -t public.argo_profiles \
#     -t public.argo_measurements -t public.qc_stats \
#     -t public.regional_monthly_avg -f floatchat_data.sql