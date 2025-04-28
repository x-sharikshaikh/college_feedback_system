# Add project root to Python path so that utils can be imported properly
import sys
import os

# Get the project root directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Add project root to Python path if not already there
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)
