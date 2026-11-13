# Headmaster SaaS test deployment fix

The public frontend uses `/api/hm`. The API on port 4108 registers `/dashboard/`,
`/students/`, etc., without that prefix. The trailing slash in the supplied
Nginx location strips `/api/hm/` before forwarding. Replace only the old location
inside the existing shared SGS/SSS HTTPS server; preserve its Host headers and
other module routes. Back up the site file and use `nginx -t` before reloading.

The backend fix gives optional NULL SQL parameters explicit TEXT/INTEGER/BIGINT
types. Psycopg otherwise raises `AmbiguousParameter` for omitted student,
teacher and report filters. No database migration or data changes are required.
Deploy `backend/app/routes/student_routes.py` and `teacher_routes.py` together.
Restart only `demo-hm-api` after installing the reviewed source.

Backend requirements pin tenant-kit to the exact commit verified on the test
server. Its schema does not include the newer `platform.tenant_features` table.
Do not upgrade the kit independently of an approved platform schema rollout.

Verified on SGS test: dashboard, students, classes, teachers, subjects and
consolidated reports return HTTP 200. Also verified Student health remains 200.
For local SQL regression tests, set `HEADMASTER_FILTER_TEST_DATABASE_URL` to a
disposable local `student_timetable_test` DB and run
`python -m unittest discover -s backend/tests -v`. Fixtures use temporary tables.

Server path: `/home/ubuntu/demo/sgs-header-master-module`. Backups were made before
the hotfix. Environment secrets and tenant-specific account records are not
included in this repo. No frontend rebuild is needed for these fixes.
