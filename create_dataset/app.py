from flask import Flask, render_template, request, jsonify, redirect, url_for
import joblib
import pandas as pd
import numpy as np
import os
from datetime import datetime

app = Flask(__name__)

# Path to saved model (joblib dict with keys: 'model' and 'features')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'xgb_mental_health_model.pkl')
DATA_LOG = os.path.join(os.path.dirname(__file__), 'data', 'submissions.csv')

# Load model once
model_pkg = None
model = None
feature_cols = None
if os.path.exists(MODEL_PATH):
    model_pkg = joblib.load(MODEL_PATH)
    model = model_pkg.get('model') if isinstance(model_pkg, dict) else model_pkg
    feature_cols = model_pkg.get('features') if isinstance(model_pkg, dict) else None
else:
    print("WARNING: Model file not found at", MODEL_PATH)

# Ensure data folder and file
os.makedirs(os.path.dirname(DATA_LOG), exist_ok=True)
if not os.path.exists(DATA_LOG):
    # create CSV with headers
    pd.DataFrame(columns=(feature_cols if feature_cols else []) + ['mental_health_condition','predicted_mental_health','timestamp']).to_csv(DATA_LOG, index=False)

@app.route('/')
def index():
    # Render questionnaire form
    # For select inputs we want friendly labels — template handles this
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if model is None or feature_cols is None:
        return jsonify({'error': 'Model not loaded on server.'}), 500

    # Extract form data
    data = {}
    for f in feature_cols:
        val = request.form.get(f)
        if val is None:
            # attempt common alternate names
            val = request.form.get(f.lower())
        data[f] = val

    # Convert to numeric types where appropriate
    X = pd.DataFrame([data])
    # Coerce numeric columns
    for col in X.columns:
        # try convert to numeric, if fails keep as is
        try:
            X[col] = pd.to_numeric(X[col], errors='coerce')
        except Exception:
            pass
    # Fill na with median or 0
    for col in X.columns:
        if X[col].dtype in [np.float64, np.int64]:
            X[col] = X[col].fillna(X[col].median())
        else:
            X[col] = X[col].fillna(0)

    # Reorder columns to model's feature order
    X = X[feature_cols]

    # Prediction
    pred = model.predict(X)[0]
    # If model is regressor and output not 1-100, clamp
    try:
        pred_val = float(pred)
    except Exception:
        pred_val = float(pred[0]) if hasattr(pred,'__iter__') else 0.0
    pred_val = max(1.0, min(100.0, pred_val))

    # Save submission
    out = X.copy()
    out['predicted_mental_health'] = round(pred_val,2)
    out['timestamp'] = datetime.utcnow().isoformat()

    # Try to get an actual mental_health_condition from form if user provided (optional)
    actual = request.form.get('mental_health_condition')
    if actual is not None:
        try:
            out['mental_health_condition'] = float(actual)
        except Exception:
            out['mental_health_condition'] = ''
    else:
        out['mental_health_condition'] = ''

    # Append to CSV
    out.to_csv(DATA_LOG, mode='a', header=False, index=False)

    # Redirect to dashboard for this latest entry (show recent)
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    # Read submissions and show last 50
    df = pd.read_csv(DATA_LOG)
    recent = df.tail(50).iloc[::-1]  # reverse for newest first

    # Compute some aggregate stats for charts
    # Example: distribution of predicted scores, average by gender
    stats = {}
    if 'predicted_mental_health' in df.columns:
        stats['pred_mean'] = float(df['predicted_mental_health'].dropna().astype(float).mean())
        stats['pred_std'] = float(df['predicted_mental_health'].dropna().astype(float).std())
        hist_vals = np.histogram(df['predicted_mental_health'].dropna().astype(float), bins=10, range=(0,100))
        stats['hist_bins'] = hist_vals[1].tolist()
        stats['hist_counts'] = hist_vals[0].tolist()
    else:
        stats['pred_mean'] = 0
        stats['pred_std'] = 0
        stats['hist_bins'] = []
        stats['hist_counts'] = []

    # Convert recent table to records for the template
    records = recent.to_dict(orient='records')
    return render_template('dashboard.html', records=records, stats=stats, feature_cols=feature_cols)

if __name__ == '__main__':
    app.run(debug=True)
