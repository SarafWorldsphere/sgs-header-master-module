"""Execute route SQL with omitted filters on temporary local PostgreSQL tables."""
import ast
import os
from pathlib import Path
import unittest

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

URL = os.getenv('HEADMASTER_FILTER_TEST_DATABASE_URL', '')
ROUTES = Path(__file__).resolve().parents[1] / 'app/routes'


def route_query(filename, function):
    module = ast.parse((ROUTES/filename).read_text(encoding='utf-8'))
    node = next(n for n in module.body if isinstance(n, ast.FunctionDef) and n.name == function)
    return next(n.value.value for n in node.body if isinstance(n, ast.Assign)
                and any(isinstance(t, ast.Name) and t.id == 'query' for t in n.targets))


@unittest.skipUnless(URL, 'Set local HEADMASTER_FILTER_TEST_DATABASE_URL')
class OptionalFilterSqlTests(unittest.TestCase):
    def setUp(self):
        url = make_url(URL)
        if url.host not in ('localhost','127.0.0.1') or url.database != 'student_timetable_test':
            raise RuntimeError('Tests require local student_timetable_test, never a deployed DB')
        self.engine = create_engine(URL)
        self.db = self.engine.connect()
        self.db.exec_driver_sql('''
            CREATE TEMP TABLE class_master (tenant_id uuid, class_id bigint, class_name text, section_name text, academic_year text);
            CREATE TEMP TABLE student_master (student_id bigint, admission_no text, full_name text, class_id bigint,
                section text, roll_no text, student_phone text, student_email text, record_status text);
            CREATE TEMP TABLE teacher_master (teacher_id bigint, tenant_id uuid, full_name text, subject_name text,
                class_id bigint, section_1 text, section_2 text, role text, email_id text, phone bigint, is_active bool);
            CREATE TEMP TABLE teacher_class_subject_map (assignment_id bigint, tenant_id uuid, teacher_id bigint,
                class_id bigint, subject_name text, academic_year text, is_class_teacher bool, is_active bool);
            INSERT INTO class_master VALUES ('11111111-1111-1111-1111-111111111111',18,'8','A','2026-27');
            INSERT INTO student_master VALUES (1,'A1','Test student',18,'A','1',NULL,NULL,'Active');
            INSERT INTO teacher_master VALUES (1,'11111111-1111-1111-1111-111111111111','Test teacher','Science',18,'A',NULL,'Teacher',NULL,NULL,true);
            INSERT INTO teacher_class_subject_map VALUES (1,'11111111-1111-1111-1111-111111111111',1,18,'Science','2026-27',false,true);
        ''')

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_students_without_filters_and_with_matching_and_nonmatching_filters(self):
        query = text(route_query('student_routes.py','get_students'))
        for values, count in [({'class_name':None,'section':None},1),
                              ({'class_name':'8','section':'A'},1),
                              ({'class_name':'8','section':'B'},0)]:
            with self.subTest(values=values):
                self.assertEqual(len(self.db.execute(query,values).all()),count)

    def test_teachers_without_subject_and_with_subject_filter(self):
        # Keep the production SQL intact apart from directing explicit public
        # relation names to this connection's temporary fixture namespace.
        query = text(route_query('teacher_routes.py','get_teachers').replace('public.','pg_temp.'))
        for values, count in [({'teacher_type':'all','subject':None},1),
                              ({'teacher_type':'subject','subject':'Science'},1),
                              ({'teacher_type':'subject','subject':'Maths'},0)]:
            with self.subTest(values=values):
                self.assertEqual(len(self.db.execute(query,values).all()),count)
