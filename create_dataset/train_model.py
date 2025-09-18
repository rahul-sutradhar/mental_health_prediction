# train_xgboost.py
import pandas as pd
import numpy as np
import joblib
import json
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import mean_squared_error, r2_score
from xgboost import XGBRegressor
import matplotlib.pyplot as plt

# =====================
# 1. Load Dataset
# =====================
df = pd.read_csv("student_mental_health_synthetic.csv")

X = df.drop(columns=["mental_health_condition"])
y = df["mental_health_condition"]

# =====================
# 2. Train/Test Split
# =====================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# =====================
# 3. Baseline Model
# =====================
print("\n===== BASELINE MODEL =====")
baseline = XGBRegressor(objective="reg:squarederror", random_state=42, n_jobs=-1)
baseline.fit(X_train, y_train)
y_pred_baseline = baseline.predict(X_test)
baseline_rmse = np.sqrt(mean_squared_error(y_test, y_pred_baseline))
baseline_r2 = r2_score(y_test, y_pred_baseline)
print(f"Baseline RMSE: {baseline_rmse:.3f}")
print(f"Baseline R²:   {baseline_r2:.3f}")

# =====================
# 4. Hyperparameter Tuning
# =====================
print("\n===== HYPERPARAMETER TUNING =====")
param_grid = {
    "n_estimators": [200, 400],
    "max_depth": [4, 6],
    "learning_rate": [0.05, 0.1],
    "subsample": [0.8, 1.0],
    "colsample_bytree": [0.8, 1.0]
}

grid_search = GridSearchCV(
    estimator=XGBRegressor(objective="reg:squarederror", random_state=42, n_jobs=-1),
    param_grid=param_grid,
    scoring="neg_root_mean_squared_error",
    cv=3,
    verbose=2
)

grid_search.fit(X_train, y_train)
best_model = grid_search.best_estimator_

print(f"Best Params: {grid_search.best_params_}")
print(f"Best CV RMSE: {-grid_search.best_score_:.3f}")

# =====================
# 5. Final Model Evaluation
# =====================
y_pred_final = best_model.predict(X_test)
final_rmse = np.sqrt(mean_squared_error(y_test, y_pred_final))
final_r2 = r2_score(y_test, y_pred_final)

print("\n===== FINAL MODEL =====")
print(f"Final RMSE: {final_rmse:.3f}")
print(f"Final R²:   {final_r2:.3f}")

# =====================
# 6. Feature Importance
# =====================
importances = best_model.feature_importances_
sorted_idx = np.argsort(importances)[::-1]
plt.figure(figsize=(10, 6))
plt.bar(range(len(importances)), importances[sorted_idx])
plt.xticks(range(len(importances)), X.columns[sorted_idx], rotation=45, ha="right")
plt.title("Feature Importances (XGBoost)")
plt.tight_layout()
plt.savefig("feature_importances.png")
plt.close()
print("✅ Feature importance plot saved as feature_importances.png")

# =====================
# 7. Save Model + Metrics
# =====================
joblib.dump({"model": best_model, "features": X.columns.tolist()}, "xgb_mental_health_model.pkl")
metrics = {"baseline_rmse": float(baseline_rmse), "baseline_r2": float(baseline_r2),
           "final_rmse": float(final_rmse), "final_r2": float(final_r2),
           "best_params": grid_search.best_params_}
with open("xgb_model_metrics.json", "w") as f:
    json.dump(metrics, f, indent=4)

print("✅ Model saved as xgb_mental_health_model.pkl")
print("✅ Metrics saved as xgb_model_metrics.json")