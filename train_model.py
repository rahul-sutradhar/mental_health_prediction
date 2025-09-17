"""
Mental Health Prediction Model Training Script
Trains XGBoost models on synthetic mental health datasets
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import pickle
import os
from datetime import datetime

# Set random seed for reproducibility
np.random.seed(42)

def generate_synthetic_dataset(n_samples=10000):
    """Generate synthetic mental health dataset with realistic correlations"""
    
    print(f"Generating synthetic dataset with {n_samples} samples...")
    
    # Demographics
    age = np.random.normal(20, 2.5, n_samples).clip(16, 30).astype(int)
    gender = np.random.choice([0, 1, 2], n_samples, p=[0.45, 0.45, 0.10])  # 0: Male, 1: Female, 2: Other
    academic_year = np.random.choice([1, 2, 3, 4, 5], n_samples, p=[0.25, 0.25, 0.25, 0.20, 0.05])
    major = np.random.choice([0, 1, 2, 3, 4, 5, 6, 7], n_samples)  # Different majors
    cgpa = np.random.beta(2, 1, n_samples) * 4.0  # Skewed towards higher GPAs
    residential_status = np.random.choice([0, 1, 2], n_samples, p=[0.4, 0.3, 0.3])
    
    # Lifestyle factors with realistic correlations
    sleep_duration = np.random.normal(7, 1.5, n_samples).clip(3, 12)
    
    # Academic pressure correlates with academic year and CGPA
    academic_pressure = (
        np.random.normal(3, 1, n_samples) + 
        0.3 * academic_year + 
        -0.5 * cgpa + 
        np.random.normal(0, 0.5, n_samples)
    ).clip(1, 5)
    
    # Physical activity (higher academic pressure tends to reduce activity)
    physical_activity = (
        np.random.normal(3, 1, n_samples) + 
        -0.2 * academic_pressure + 
        np.random.normal(0, 0.3, n_samples)
    ).clip(1, 5)
    
    # Dietary habits correlate with sleep and activity
    dietary_habits = (
        np.random.normal(3, 1, n_samples) + 
        0.2 * physical_activity + 
        0.1 * sleep_duration + 
        np.random.normal(0, 0.4, n_samples)
    ).clip(1, 5)
    
    # Social connectedness (gender and residential status effects)
    social_connectedness = (
        np.random.normal(3, 1, n_samples) + 
        0.3 * (gender == 1) + 
        0.2 * (residential_status == 0) + 
        np.random.normal(0, 0.5, n_samples)
    ).clip(1, 5)
    
    # Screen time correlates negatively with social connectedness and physical activity
    screen_time = (
        np.random.normal(6, 2, n_samples) + 
        -0.3 * social_connectedness + 
        -0.2 * physical_activity + 
        np.random.normal(0, 0.8, n_samples)
    ).clip(1, 16)
    
    # Psychological factors
    family_history = np.random.choice([0, 0.5, 1], n_samples, p=[0.7, 0.15, 0.15])
    financial_stress = np.random.choice([1, 2, 3, 4, 5], n_samples, p=[0.2, 0.25, 0.3, 0.2, 0.05])
    treatment_history = np.random.choice([0, 1, 2], n_samples, p=[0.75, 0.15, 0.10])
    
    # Coping mechanisms correlate with social connectedness and activity
    coping_mechanisms = (
        np.random.normal(3, 1, n_samples) + 
        0.3 * social_connectedness + 
        0.2 * physical_activity + 
        np.random.normal(0, 0.4, n_samples)
    ).clip(1, 5)
    
    # Create mental health score based on all factors
    mental_health_score = (
        70 +  # Base score
        2 * sleep_duration +  # Sleep is very important
        -3 * academic_pressure +
        2 * physical_activity +
        1.5 * dietary_habits +
        3 * social_connectedness +
        -0.5 * screen_time +
        -5 * family_history +
        -2 * financial_stress +
        2 * coping_mechanisms +
        -1 * treatment_history +
        np.random.normal(0, 5, n_samples)  # Random noise
    ).clip(0, 100)
    
    # Create risk categories
    risk_level = np.where(mental_health_score >= 80, 0,  # Low risk
                 np.where(mental_health_score >= 60, 1, 2))  # Moderate, High risk
    
    # Create DataFrame
    data = pd.DataFrame({
        'age': age,
        'gender': gender,
        'academic_year': academic_year,
        'major': major,
        'cgpa': cgpa,
        'residential_status': residential_status,
        'sleep_duration': sleep_duration,
        'dietary_habits': dietary_habits,
        'physical_activity': physical_activity,
        'social_connectedness': social_connectedness,
        'screen_time': screen_time,
        'family_history': family_history,
        'financial_stress': financial_stress,
        'academic_pressure': academic_pressure,
        'treatment_history': treatment_history,
        'coping_mechanisms': coping_mechanisms,
        'mental_health_score': mental_health_score,
        'risk_level': risk_level
    })
    
    return data

def train_xgboost_model(data):
    """Train XGBoost model with hyperparameter tuning"""
    
    print("Training XGBoost model...")
    
    # Prepare features and target
    feature_columns = [
        'age', 'gender', 'academic_year', 'major', 'cgpa', 'residential_status',
        'sleep_duration', 'dietary_habits', 'physical_activity', 'social_connectedness',
        'screen_time', 'family_history', 'financial_stress', 'academic_pressure',
        'treatment_history', 'coping_mechanisms'
    ]
    
    X = data[feature_columns]
    y = data['mental_health_score']
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # XGBoost hyperparameter tuning
    param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [3, 5, 7],
        'learning_rate': [0.01, 0.1, 0.2],
        'subsample': [0.8, 0.9],
        'colsample_bytree': [0.8, 0.9]
    }
    
    xgb_model = xgb.XGBRegressor(random_state=42, objective='reg:squarederror')
    
    print("Performing hyperparameter tuning...")
    grid_search = GridSearchCV(
        xgb_model, 
        param_grid, 
        cv=3, 
        scoring='neg_mean_squared_error',
        n_jobs=-1,
        verbose=1
    )
    
    grid_search.fit(X_train_scaled, y_train)
    
    # Best model
    best_model = grid_search.best_estimator_
    
    # Predictions
    y_pred = best_model.predict(X_test_scaled)
    
    # Convert to classification for evaluation metrics
    y_test_class = np.where(y_test >= 80, 0, np.where(y_test >= 60, 1, 2))
    y_pred_class = np.where(y_pred >= 80, 0, np.where(y_pred >= 60, 1, 2))
    
    # Calculate metrics
    accuracy = accuracy_score(y_test_class, y_pred_class)
    precision = precision_score(y_test_class, y_pred_class, average='weighted')
    recall = recall_score(y_test_class, y_pred_class, average='weighted')
    f1 = f1_score(y_test_class, y_pred_class, average='weighted')
    
    print(f"\nModel Performance:")
    print(f"Best Parameters: {grid_search.best_params_}")
    print(f"Accuracy: {accuracy:.3f}")
    print(f"Precision: {precision:.3f}")
    print(f"Recall: {recall:.3f}")
    print(f"F1-Score: {f1:.3f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_columns,
        'importance': best_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\nTop 5 Most Important Features:")
    for idx, row in feature_importance.head().iterrows():
        print(f"{row['feature']}: {row['importance']:.3f}")
    
    return best_model, scaler, feature_importance, {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'best_params': grid_search.best_params_
    }

def save_model_artifacts(model, scaler, feature_importance, metrics):
    """Save model and associated artifacts"""
    
    print("Saving model artifacts...")
    
    # Create models directory
    os.makedirs('models', exist_ok=True)
    
    # Save model
    with open('models/xgboost_mental_health_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    # Save scaler
    with open('models/feature_scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    
    # Save feature importance
    feature_importance.to_csv('models/feature_importance.csv', index=False)
    
    # Save metrics
    with open('models/model_metrics.pkl', 'wb') as f:
        pickle.dump(metrics, f)
    
    # Save training metadata
    metadata = {
        'training_date': datetime.now().isoformat(),
        'model_type': 'XGBoost Regressor',
        'features': feature_importance['feature'].tolist(),
        'metrics': metrics
    }
    
    with open('models/model_metadata.pkl', 'wb') as f:
        pickle.dump(metadata, f)
    
    print("Model artifacts saved successfully!")

def main():
    """Main training pipeline"""
    
    print("=== Mental Health Prediction Model Training ===")
    print(f"Training started at: {datetime.now()}")
    
    # Generate multiple datasets for better generalization
    datasets = []
    for i in range(3):  # Train on 3 different synthetic datasets
        print(f"\nGenerating dataset {i+1}/3...")
        dataset = generate_synthetic_dataset(n_samples=3500)
        datasets.append(dataset)
    
    # Combine datasets
    combined_data = pd.concat(datasets, ignore_index=True)
    print(f"\nCombined dataset size: {len(combined_data)} samples")
    
    # Train model
    model, scaler, feature_importance, metrics = train_xgboost_model(combined_data)
    
    # Save everything
    save_model_artifacts(model, scaler, feature_importance, metrics)
    
    print(f"\n=== Training completed at: {datetime.now()} ===")
    print("Model ready for deployment!")

if __name__ == "__main__":
    main()