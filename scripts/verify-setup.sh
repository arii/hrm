#!/bin/bash
# This script verifies the NGINX configuration and helps set up the .env file.

# Ensure the script is run from the project root
cd "$(dirname "$0")/.."

# --- NGINX Configuration Verification ---
verify_nginx_config() {
  echo "--- Verifying NGINX Configuration ---"

  if ! command -v nginx &> /dev/null; then
    echo "WARNING: nginx command not found. Skipping NGINX configuration check."
    echo "Please install nginx to enable this check."
    return 0 # Not a fatal error
  fi

  read -p "Enter your domain name (e.g., myapp.com): " DOMAIN_NAME

  if [ -z "$DOMAIN_NAME" ]; then
    echo "ERROR: Domain name cannot be empty."
    return 1
  fi

  echo "Generating nginx config for domain: $DOMAIN_NAME"

  GENERATED_CONF=$(mktemp)

  sed "s/YOUR_DOMAIN.com/$DOMAIN_NAME/g" nginx.conf.template > $GENERATED_CONF

  echo "Testing the generated nginx configuration..."

  if sudo nginx -t -c $GENERATED_CONF; then
    echo "SUCCESS: NGINX configuration for $DOMAIN_NAME is valid."
  else
    echo "ERROR: NGINX configuration is invalid. Please check the output above."
    rm $GENERATED_CONF
    return 1
  fi

  rm $GENERATED_CONF
  echo "----------------------------------------"
}

# --- .env File Setup ---
setup_env_file() {
  echo "--- Setting up .env file ---"
  ENV_FILE=".env.local"

  if [ ! -f "$ENV_FILE" ]; then
    echo "Creating $ENV_FILE from .env.example..."
    cp .env.example "$ENV_FILE"
  fi

  # Function to check and prompt for a variable
  check_and_set_var() {
    VAR_NAME=$1
    # Use grep to check if the variable is present and has a value
    if ! grep -q "^\s*$VAR_NAME\s*=\s*." "$ENV_FILE"; then
      if [ "$VAR_NAME" == "NEXTAUTH_SECRET" ]; then
        read -p "NEXTAUTH_SECRET is not set. Generate one automatically? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
          SECRET=$(openssl rand -hex 32)
          echo "Generated NEXTAUTH_SECRET: $SECRET"
          # Use sed to replace the empty value
          sed -i.bak "/^$VAR_NAME=/s/=.*/=$SECRET/" "$ENV_FILE" && rm "${ENV_FILE}.bak"
          return
        fi
      fi
      read -p "Enter the value for $VAR_NAME: " VAR_VALUE
      if [ -z "$VAR_VALUE" ]; then
        echo "ERROR: $VAR_NAME cannot be empty."
        return 1
      fi
      sed -i.bak "/^$VAR_NAME=/s/=.*/=$VAR_VALUE/" "$ENV_FILE" && rm "${ENV_FILE}.bak"
    fi
  }

  check_and_set_var "NEXTAUTH_SECRET"
  check_and_set_var "SPOTIFY_CLIENT_ID"
  check_and_set_var "SPOTIFY_CLIENT_SECRET"
  check_and_set_var "INTERNAL_TOKEN_DELIVERY_SECRET"

  echo "SUCCESS: .env file setup is complete."
  echo "----------------------------------------"
}

# Main execution flow
verify_nginx_config
if [ $? -ne 0 ]; then
  echo "NGINX configuration verification failed. Aborting."
  exit 1
fi

setup_env_file
if [ $? -ne 0 ]; then
  echo ".env file setup failed. Aborting."
  exit 1
fi

echo "All checks passed. Your setup is ready!"
