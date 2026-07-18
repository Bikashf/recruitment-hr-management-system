import socket
import time
import sys

def wait_for_db(host="db", port=5432, timeout=30):
    print(f"Waiting for database connection at {host}:{port}...")
    for i in range(1, timeout + 1):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.0)
        try:
            s.connect((host, port))
            s.close()
            print("Database is up!")
            return True
        except (socket.error, socket.timeout) as e:
            s.close()
            print(f"Attempt {i}/{timeout}: Database not reachable yet ({e}). Retrying in 1s...")
            time.sleep(1)
            
    print(f"Error: Database at {host}:{port} was not reachable after {timeout} seconds.", file=sys.stderr)
    return False

if __name__ == "__main__":
    if not wait_for_db():
        sys.exit(1)
