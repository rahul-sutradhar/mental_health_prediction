import joblib

# =====================
# 8. Demonstrate Loading & Prediction
# =====================
saved = joblib.load("xgb_mental_health_model.pkl")
loaded_model = saved["model"]
feature_order = saved["features"]

# Example prediction
new_data = pd.DataFrame([{
    "academic_pressure": 6.5,
    "social_connectedness": 7.2,
    "family_history": 1,
    "sleep_duration": 6.5,
    "physical_activity": 3.5,
    "coping_mechanisms": 5.5,
    "financial_stress": 7,
    "dietary_habits": 6,
    "screen_time": 5,
    "treatment_history": 0,
    "residential_status": 0,
    "gender": 1,
    "age": 20,
    "major": 0,
    "cgpa": 7.5,
    "academic_year": 3
}])[feature_order]  # ensure correct column order

prediction = loaded_model.predict(new_data)
print(f"Example Prediction: {prediction[0]:.2f}")
