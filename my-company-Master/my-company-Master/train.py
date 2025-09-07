import sys
import os

# Add the project root to the Python path to allow imports from 'core' and 'ml'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.timeline_model import TimelineModel

def main():
    """
    Main function to instantiate and train the timeline prediction model.
    This would be run as part of a CI/CD pipeline or a scheduled job.
    """
    print("--- Running ML Model Training Script ---")
    model = TimelineModel()
    model.train()
    print("--- ML Model Training Script Finished ---")

if __name__ == "__main__":
    main()
