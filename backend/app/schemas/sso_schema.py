
from pydantic import BaseModel, EmailStr, model_validator


class SSOTokenRequest(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None
    @model_validator(mode="after")
    def validate_identity(self):
        if bool(self.email) == bool(self.phone):
            raise ValueError("Send either email or phone, not both")
        return self