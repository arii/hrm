import os
import urllib.request
import json
import urllib.error

token = os.environ.get("GITHUB_TOKEN")
headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json"}

def get_url(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 0, str(e)

status, body = get_url("https://api.github.com/repos/arii/hrm/issues/9131/comments")
print(f"Status Issues: {status}")
print(body)

status, body = get_url("https://api.github.com/repos/arii/hrm/pulls/9131/reviews")
print(f"Status Reviews: {status}")
print(body)
