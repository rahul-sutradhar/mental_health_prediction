# Use Python 3.11
FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential

# Upgrade pip & install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt


# Copy project files
COPY . .

# Expose Render port
EXPOSE 5000

# Run the app with Gunicorn (adjust `app:app` if your entrypoint differs)
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]