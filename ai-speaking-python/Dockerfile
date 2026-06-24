FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] pydantic pydantic-settings httpx \
    python-dotenv sqlalchemy aiomysql openai groq loguru tenacity python-multipart

COPY . .

EXPOSE 5181

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5181"]
