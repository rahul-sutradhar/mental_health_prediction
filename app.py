from flask import Flask, render_template, request, session, jsonify, redirect, url_for, make_response
import os
import pickle
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.preprocessing import StandardScaler, LabelEncoder
import plotly.graph_objs as go
import plotly.utils
import json
from datetime import datetime
import uuid
import traceback

app = Flask(__name__)
app.secret_key = os.environ.get('SESSION_SECRET')
if not app.secret_key:
    print("WARNING: SESSION_SECRET environment variable not set. Using fallback for development only.")
    app.secret_key = 'mental_health_app_development_key'

# Configure Flask to work with Replit
app.config['SERVER_NAME'] = None

@app.after_request
def add_header(response):
    """Add headers to prevent caching and blurry back navigation"""
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# Load trained model and scaler
model = None
scaler = None
feature_importance_data = None

def load_model():
    """Load the trained XGBoost model and preprocessing components"""
    global model, scaler, feature_importance_data
    
    try:
        # Load model
        with open('./models/xgboost_mental_health_model.pkl', 'rb') as f:
            model = pickle.load(f)
        print("XGBoost model loaded successfully")
        
        # Load scaler
        with open('./models/feature_scaler.pkl', 'rb') as f:
            scaler = pickle.load(f)
        print("Feature scaler loaded successfully")
        
        # Load feature importance
        feature_importance_df = pd.read_csv('./models/feature_importance.csv')
        print(f"Loaded feature importance data with shape: {feature_importance_df.shape}")
        
        # Format feature names for display
        def format_feature_name(name):
            return ' '.join(word.capitalize() for word in name.split('_'))
        
        feature_importance_data = {
            'features': [format_feature_name(feat) for feat in feature_importance_df['feature']],
            'importance': feature_importance_df['importance'].astype(float).tolist()
        }
        print("Feature importance data prepared for API")
        
    except FileNotFoundError as e:
        print(f"Error: Model files not found: {e}")
        feature_importance_data = None
    except Exception as e:
        print(f"Error loading model components: {str(e)}")
        print("Stack trace:", traceback.format_exc())
        feature_importance_data = None

# Load model on startup
load_model()

@app.route('/')
def index():
    """Home page with introduction to the mental health assessment"""
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return render_template('index.html')

@app.route('/questionnaire')
def questionnaire():
    """Start the comprehensive mental health questionnaire"""
    return render_template('questionnaire.html')

@app.route('/submit-questionnaire', methods=['POST'])
def submit_questionnaire():
    """Process questionnaire responses and generate prediction"""
    data = request.get_json()
    
    # Store user responses in session
    session['questionnaire_data'] = data
    session['assessment_date'] = datetime.now().isoformat()
    
    # Process the data and make prediction
    prediction_result = make_prediction(data)
    
    # Store prediction results
    session['latest_prediction'] = prediction_result
    
    return jsonify(prediction_result)

@app.route('/dashboard')
def dashboard():
    """Personal dashboard with prediction results and statistics"""
    if 'latest_prediction' not in session:
        return redirect(url_for('questionnaire'))
    
    return render_template('dashboard.html', 
                         prediction=session['latest_prediction'],
                         questionnaire_data=session.get('questionnaire_data', {}))

@app.route('/api/feature-importance')
def feature_importance():
    """API endpoint for feature importance data"""
    try:
        if feature_importance_data:
            # Take top 10 features by importance
            features = feature_importance_data['features']
            importance = feature_importance_data['importance']
            
            # Sort by importance
            sorted_data = sorted(zip(features, importance), 
                               key=lambda x: x[1], 
                               reverse=True)[:10]
            
            return jsonify({
                'features': [item[0] for item in sorted_data],
                'importance': [item[1] for item in sorted_data]
            })
    except Exception as e:
        print(f"Error in feature importance API: {e}")
        
    # Fallback data if model not loaded or error occurs
    return jsonify({
        'features': [
            'Academic Pressure',
            'Social Connectedness',
            'Sleep Duration',
            'Physical Activity',
            'Financial Stress'
        ],
        'importance': [0.25, 0.22, 0.18, 0.16, 0.15]
    })

def preprocess_questionnaire_data(questionnaire_data):
    """Convert questionnaire responses to model features"""
    
    # Map categorical variables to numeric values
    gender_map = {'male': 0, 'female': 1, 'non_binary': 2, 'prefer_not_to_say': 2}
    academic_year_map = {'1': 1, '2': 2, '3': 3, '4': 4, 'graduate': 5}
    major_map = {
        'engineering': 0, 'medicine': 1, 'business': 2, 'arts': 3,
        'science': 4, 'computer_science': 5, 'social_sciences': 6, 'other': 7
    }
    residential_map = {'on_campus': 0, 'off_campus': 1, 'with_family': 2}
    
    # Extract and convert features
    features = {
        'age': float(questionnaire_data.get('age', 20)),
        'gender': gender_map.get(questionnaire_data.get('gender', 'male'), 0),
        'academic_year': academic_year_map.get(questionnaire_data.get('academic_year', '2'), 2),
        'major': major_map.get(questionnaire_data.get('major', 'other'), 7),
        'cgpa': float(questionnaire_data.get('cgpa', 3.0)),
        'residential_status': residential_map.get(questionnaire_data.get('residential_status', 'with_family'), 2),
        'sleep_duration': float(questionnaire_data.get('sleep_duration', 7)),
        'dietary_habits': float(questionnaire_data.get('dietary_habits', 3)),
        'physical_activity': float(questionnaire_data.get('physical_activity', 3)),
        'social_connectedness': float(questionnaire_data.get('social_connectedness', 3)),
        'screen_time': float(questionnaire_data.get('screen_time', 6)),
        'family_history': float(questionnaire_data.get('family_history', 0)),
        'financial_stress': float(questionnaire_data.get('financial_stress', 2)),
        'academic_pressure': float(questionnaire_data.get('academic_pressure', 3)),
        'treatment_history': float(questionnaire_data.get('treatment_history', 0)),
        'coping_mechanisms': float(questionnaire_data.get('coping_mechanisms', 3))
    }
    
    return features

def analyze_risk_factors_and_recommendations(features, prediction_score):
    """Analyze user data to identify risk factors and provide recommendations"""
    
    risk_factors = []
    recommendations = []
    
    # Sleep analysis
    if features['sleep_duration'] < 6:
        risk_factors.append("Insufficient sleep duration")
        recommendations.append("Aim for 7-9 hours of sleep per night")
    elif features['sleep_duration'] > 10:
        risk_factors.append("Excessive sleep duration")
        recommendations.append("Consider maintaining a regular sleep schedule")
    
    # Academic pressure
    if features['academic_pressure'] >= 4:
        risk_factors.append("High perceived academic pressure")
        recommendations.append("Consider stress management techniques and time management skills")
    
    # Social connectedness
    if features['social_connectedness'] <= 2:
        risk_factors.append("Low social connectedness")
        recommendations.append("Try to build and maintain social relationships")
    
    # Financial stress
    if features['financial_stress'] >= 4:
        risk_factors.append("High financial stress")
        recommendations.append("Seek financial counseling or budgeting assistance")
    
    # Physical activity
    if features['physical_activity'] <= 2:
        risk_factors.append("Low physical activity level")
        recommendations.append("Incorporate regular exercise into your routine")
    
    # Screen time
    if features['screen_time'] >= 10:
        risk_factors.append("Excessive screen time")
        recommendations.append("Consider digital wellness practices and screen time limits")
    
    # Family history
    if features['family_history'] >= 0.5:
        risk_factors.append("Family history of mental health issues")
        recommendations.append("Consider discussing family history with a healthcare provider")
    
    # Coping mechanisms
    if features['coping_mechanisms'] <= 2:
        risk_factors.append("Poor coping mechanisms")
        recommendations.append("Develop healthy coping strategies like mindfulness or hobbies")
    
    # Treatment history
    if features['treatment_history'] >= 1:
        recommendations.append("Continue following up with mental health professionals")
    
    return risk_factors, recommendations

def make_prediction(questionnaire_data):
    """Make mental health prediction using XGBoost model"""
    try:
        if model is None or scaler is None:
            # Fallback to rule-based prediction if model not loaded
            return make_fallback_prediction(questionnaire_data)
        
        # Preprocess the data
        features = preprocess_questionnaire_data(questionnaire_data)
        
        # Create feature array in the correct order
        feature_order = [
            'age', 'gender', 'academic_year', 'major', 'cgpa', 'residential_status',
            'sleep_duration', 'dietary_habits', 'physical_activity', 'social_connectedness',
            'screen_time', 'family_history', 'financial_stress', 'academic_pressure',
            'treatment_history', 'coping_mechanisms'
        ]
        
        feature_array = np.array([features[feature] for feature in feature_order]).reshape(1, -1)
        
        # Scale features
        feature_array_scaled = scaler.transform(feature_array)
        
        # Make prediction
        prediction_score = model.predict(feature_array_scaled)[0]
        
        # Ensure score is in valid range
        mental_health_score = max(0, min(100, int(round(prediction_score))))
        
        # Determine risk level
        if mental_health_score >= 80:
            risk_level = "Low Risk"
            risk_color = "#28A745"
        elif mental_health_score >= 60:
            risk_level = "Moderate Risk"
            risk_color = "#FFC107"
        else:
            risk_level = "High Risk"
            risk_color = "#DC3545"
        
        # Generate risk factors and recommendations
        risk_factors, recommendations = analyze_risk_factors_and_recommendations(features, mental_health_score)
        
        return {
            'mental_health_score': mental_health_score,
            'risk_level': risk_level,
            'risk_color': risk_color,
            'risk_factors': risk_factors,
            'recommendations': recommendations,
            'assessment_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'model_used': 'XGBoost ML Model'
        }
        
    except Exception as e:
        print(f"Prediction error: {e}")
        return make_fallback_prediction(questionnaire_data)

def make_fallback_prediction(questionnaire_data):
    """Fallback prediction method when ML model is not available"""
    
    risk_factors = []
    recommendations = []
    
    # Analyze sleep duration
    sleep_hours = float(questionnaire_data.get('sleep_duration', 7))
    if sleep_hours < 6:
        risk_factors.append("Insufficient sleep")
        recommendations.append("Aim for 7-9 hours of sleep per night")
    
    # Analyze stress levels
    academic_pressure = int(questionnaire_data.get('academic_pressure', 3))
    if academic_pressure >= 4:
        risk_factors.append("High academic pressure")
        recommendations.append("Consider stress management techniques")
    
    # Calculate overall mental health score (0-100)
    base_score = 75
    score_adjustments = 0
    
    # Adjust score based on various factors
    if sleep_hours < 6:
        score_adjustments -= 10
    if academic_pressure >= 4:
        score_adjustments -= 8
    if int(questionnaire_data.get('social_connectedness', 3)) <= 2:
        score_adjustments -= 6
    if int(questionnaire_data.get('financial_stress', 2)) >= 4:
        score_adjustments -= 7
    if int(questionnaire_data.get('physical_activity', 3)) <= 2:
        score_adjustments -= 5
    
    mental_health_score = max(0, min(100, base_score + score_adjustments))
    
    # Determine risk level
    if mental_health_score >= 80:
        risk_level = "Low Risk"
        risk_color = "#28A745"
    elif mental_health_score >= 60:
        risk_level = "Moderate Risk"
        risk_color = "#FFC107"
    else:
        risk_level = "High Risk"
        risk_color = "#DC3545"
    
    return {
        'mental_health_score': mental_health_score,
        'risk_level': risk_level,
        'risk_color': risk_color,
        'risk_factors': risk_factors,
        'recommendations': recommendations,
        'assessment_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'model_used': 'Rule-based fallback'
    }

if __name__ == '__main__':
    # Production-ready settings
    # debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    debug_mode = True
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)