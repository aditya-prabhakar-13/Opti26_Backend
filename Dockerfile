# Use the latest Ubuntu version that contains GLIBC 2.38+
FROM ubuntu:24.04

# Prevent interactive prompts during apt-get install
ENV DEBIAN_FRONTEND=noninteractive

# Install Python, pip, and other necessary system tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy your whole project into the container
COPY . /app

# Create a virtual environment and install your Python dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Ensure the Linux executables have permission to run
RUN chmod +x optimizer/executables/linux/*

# Start Gunicorn (Railway provides the $PORT variable automatically)
CMD gunicorn Opti26_Backend.wsgi --bind 0.0.0.0:$PORT --timeout 600