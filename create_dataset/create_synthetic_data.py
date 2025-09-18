import numpy as np
import pandas as pd

N = 1000000
np.random.seed(42)

# Generate demographic and categorical features
age = np.clip(np.random.normal(20, 2.5, N).astype(int), 17, 30)
academic_year = np.random.choice([1,2,3,4], size=N, p=[0.3,0.25,0.2,0.25])
gender = np.random.choice([0,1,2], size=N, p=[0.48,0.48,0.04])  # 0=Male,1=Female,2=Other
major = np.random.choice([0,1,2,3], size=N, p=[0.35,0.25,0.20,0.20])  # 0=STEM,1=Arts,2=Business,3=Other
residential = np.random.choice([0,1,2], size=N, p=[0.4,0.3,0.3])  # 0=Urban,1=Suburban,2=Rural
family_history = np.random.choice([0,1], size=N, p=[0.85,0.15])
treatment_history = np.random.choice([0,1], size=N, p=[0.90,0.10])

# Numeric stress/wellness scales (1–10 or hours):
academic_pressure = np.clip(np.random.normal(5.5, 2, N), 1, 10)
social_connectedness = np.clip(np.random.normal(6, 2, N), 1, 10)
coping_mechanisms = np.clip(np.random.normal(5.5, 2, N), 1, 10)
financial_stress = np.clip(np.random.normal(6, 2, N), 1, 10)
dietary_habits = np.clip(np.random.normal(6, 2, N), 1, 10)
sleep_duration = np.clip(np.random.normal(7, 1.5, N), 4, 10)  # hours/night
physical_activity = np.clip(np.random.normal(4, 2, N), 0, 12)  # hours/week
screen_time = np.clip(np.random.normal(5, 2, N), 0.5, 12)     # hours/day
cgpa = np.clip(np.random.normal(7, 1.2, N), 4, 10)

# Compute mental_health_condition (1–100) based on factors
# Baseline = 40, then adjust by weighted factors:
mental_health = (
    40
    - 2*academic_pressure
    + 1.5*social_connectedness
    + 1.5*coping_mechanisms
    - 2*financial_stress
    + 1*physical_activity
    + 1*dietary_habits
    + 3*sleep_duration
    - 0.5*screen_time
    - 5*family_history
    - 5*treatment_history
)
# Add some noise and clip to [1,100]
mental_health = mental_health + np.random.normal(0, 8, N)
mental_health = np.clip(mental_health, 1, 100).round().astype(int)

# Assemble into DataFrame
df = pd.DataFrame({
    "age": age,
    "academic_year": academic_year,
    "gender": gender,
    "major": major,
    "residential_status": residential,
    "family_history": family_history,
    "treatment_history": treatment_history,
    "academic_pressure": np.round(academic_pressure,1),
    "social_connectedness": np.round(social_connectedness,1),
    "coping_mechanisms": np.round(coping_mechanisms,1),
    "financial_stress": np.round(financial_stress,1),
    "dietary_habits": np.round(dietary_habits,1),
    "sleep_duration": np.round(sleep_duration,1),
    "physical_activity": np.round(physical_activity,1),
    "screen_time": np.round(screen_time,1),
    "cgpa": np.round(cgpa,1),
    "mental_health_condition": mental_health
})
print(df.head(5))

df.to_csv("student_mental_health_synthetic.csv", index=False)
