FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir . uvicorn python-dotenv
COPY . .
EXPOSE 5181
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5181/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5181"]
