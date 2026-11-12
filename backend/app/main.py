
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.auth import require_headmaster

from .routes import (
    auth_routes,
    student_routes,
    teacher_routes,
    dashboard_routes,
    notification_routes,
    class_teachers,
    headmaster_routes,
    function_routes,
    tours_routes,
)

app = FastAPI(title="School Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public SSO endpoint: Common Login uses this to obtain a JWT.
app.include_router(
    auth_routes.router,
    prefix="/auth",
    tags=["Authentication"],
)

# All dashboard APIs require a valid Headmaster JWT.
headmaster_auth = [Depends(require_headmaster)]

app.include_router(
    student_routes.router,
    prefix="/students",
    tags=["Students"],
    dependencies=headmaster_auth,
)

app.include_router(
    teacher_routes.router,
    prefix="/teachers",
    tags=["Teachers"],
    dependencies=headmaster_auth,
)

app.include_router(
    dashboard_routes.router,
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=headmaster_auth,
)

app.include_router(
    class_teachers.router,
    prefix="/class-teachers",
    tags=["Class Teachers"],
    dependencies=headmaster_auth,
)

app.include_router(
    headmaster_routes.router,
    prefix="/headmaster",
    tags=["Headmaster"],
    dependencies=headmaster_auth,
)

app.include_router(
    notification_routes.router,
    prefix="/notifications",
    tags=["Notifications"],
    dependencies=headmaster_auth,
)

app.include_router(
    function_routes.router,
    prefix="/functions",
    tags=["Functions"],
    dependencies=headmaster_auth,
)

app.include_router(
    tours_routes.router,
    prefix="/tours",
    tags=["Tours"],
    dependencies=headmaster_auth,
)


# Public health check only. It does not return dashboard data.
@app.get("/")
def home():
    return {"message": "Backend running successfully"}
