FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p instance

EXPOSE 5000

# Seed demo data on first boot, then serve with gunicorn.
CMD ["sh", "-c", "python seed.py && gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app"]
