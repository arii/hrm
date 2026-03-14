with open('.github/workflows/reusable-gemini-review.yml', 'r') as f:
    content = f.read()

old_env_code = """            # Pass the JSON payload as an environment variable to avoid double fetching
            echo "PR_JSON<<EOF" >> $GITHUB_ENV
            echo "$PR_JSON" >> $GITHUB_ENV
            echo "EOF" >> $GITHUB_ENV"""

new_env_code = """            # Pass the JSON payload as an environment variable to avoid double fetching
            EOF_BOUNDARY=$(openssl rand -hex 16)
            echo "PR_JSON<<$EOF_BOUNDARY" >> $GITHUB_ENV
            echo "$PR_JSON" >> $GITHUB_ENV
            echo "$EOF_BOUNDARY" >> $GITHUB_ENV"""

content = content.replace(old_env_code, new_env_code)

with open('.github/workflows/reusable-gemini-review.yml', 'w') as f:
    f.write(content)
