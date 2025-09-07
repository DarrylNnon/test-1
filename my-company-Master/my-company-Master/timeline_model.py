import pandas as pd
from sqlalchemy import create_engine
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib
import os

from core.config import settings

MODEL_DIR = "ml_models"
MODEL_PATH = os.path.join(MODEL_DIR, "timeline_predictor.joblib")

class TimelineModel:
    def __init__(self):
        self.model = None
        self.db_uri = settings.DATABASE_URL
        self.engine = create_engine(self.db_uri)

    def _load_data(self):
        # Load data where negotiation_duration_days is not null
        query = "SELECT contract_type, contract_value, counterparty_industry, negotiation_duration_days FROM negotiation_outcomes WHERE negotiation_duration_days IS NOT NULL"
        df = pd.read_sql(query, self.engine)
        # For MVP, fill missing values. A real model would need more robust handling.
        df['contract_value'].fillna(df['contract_value'].median(), inplace=True)
        df['contract_type'].fillna('Unknown', inplace=True)
        df['counterparty_industry'].fillna('Unknown', inplace=True)
        return df

    def train(self):
        print("Starting model training...")
        df = self._load_data()

        if len(df) < 50:
            print(f"Not enough data to train model. Found {len(df)} records, need at least 50.")
            return

        X = df[['contract_type', 'contract_value', 'counterparty_industry']]
        y = df['negotiation_duration_days']

        categorical_features = ['contract_type', 'counterparty_industry']
        numeric_features = ['contract_value']

        preprocessor = ColumnTransformer(transformers=[('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)], remainder='passthrough')

        self.model = Pipeline(steps=[('preprocessor', preprocessor), ('regressor', GradientBoostingRegressor(n_estimators=100, random_state=42))])

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        self.model.fit(X_train, y_train)
        score = self.model.score(X_test, y_test)
        print(f"Model training complete. R^2 score: {score:.2f}")

        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        print(f"Model saved to {MODEL_PATH}")

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
            print("Timeline prediction model loaded from disk.")
            return True
        return False

    def predict(self, contract_data: pd.DataFrame):
        if not self.model:
            raise RuntimeError("Model is not loaded. Please train or load a model first.")
        
        prediction = self.model.predict(contract_data)
        return prediction[0]

