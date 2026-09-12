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
# `mkdir -p` runs every start (not just at build time) because the
# /app/instance mount point gets replaced by the "erp-data" Docker volume at
# container start, and that volume can come up as an empty directory (a
# known quirk with BuildKit-built images) -- recreating the dir here makes
# sure it always exists before SQLite tries to open a file inside it.
CMD ["sh", "-c", "mkdir -p /app/instance && python seed.py && gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app"]
