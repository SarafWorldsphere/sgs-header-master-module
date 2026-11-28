from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from saraswati_tenant import SchoolMiddleware
from saraswati_tenant.resolve import set_school_lookup, _lookup_database

# Enable local development support: resolve localhost / 127.0.0.1 to dev school domain
DEV_TENANT_DOMAIN = os.getenv("DEV_TENANT_DOMAIN", "sgs-test.swais.in")

def _dev_school_lookup(domain: str):
    if domain in ("localhost", "127.0.0.1"):
        return _lookup_database(DEV_TENANT_DOMAIN)
    return _lookup_database(domain)

set_school_lookup(_dev_school_lookup)

from .routes import (
    student_routes,
    teacher_routes,
    dashboard_routes,
    notification_routes,
    class_teachers,
    headmaster_routes,
    function_routes,
    tours_routes,
    school_routes,
)

app = FastAPI(title="School Management API")

app.add_middleware(SchoolMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(student_routes.router, prefix="/students", tags=["Students"])
app.include_router(teacher_routes.router, prefix="/teachers", tags=["Teachers"])
app.include_router(dashboard_routes.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(class_teachers.router, prefix="/class-teachers", tags=["Class Teachers"])
app.include_router(headmaster_routes.router, prefix="/headmaster", tags=["Headmaster"])
app.include_router(notification_routes.router, prefix="/notifications", tags=["Notifications"])
app.include_router(function_routes.router, prefix="/functions", tags=["Functions"])
app.include_router(tours_routes.router, prefix="/tours", tags=["Tours"])
app.include_router(school_routes.router, tags=["School"])

@app.get("/")
def home():
    return {"message": "Backend running successfully"}