import signal
import sys
from app import create_app

app = create_app()

def handle_sigterm(signal_number, frame):
    print("Received SIGTERM, exiting cleanly...")
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
