from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from saraswati_tenant import SchoolMiddleware

from .routes import (
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

app.add_middleware(SchoolMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/")
def home():
    return {"message": "Backend running successfully"}