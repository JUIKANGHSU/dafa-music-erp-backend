import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_flow():
    # 1. Login
    print("Testing Login...")
    login_data = {
        "username": "ruikang@example.com",
        "password": "password"
    }
    
    # Needs to be x-www-form-urlencoded
    r = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    
    if r.status_code != 200:
        print(f"Login Failed: {r.status_code} {r.text}")
        return
        
    token = r.json()["access_token"]
    print(f"Login Success. Token: {token[:10]}...")
    
    # 2. Create Student
    print("\nTesting Create Student...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    student_data = {
        "name": "測試學生 (Manual Test)",
        "phone": "0987654321"
    }
    
    # Try WITH slash
    target_url = f"{BASE_URL}/students/"
    r = requests.post(target_url, headers=headers, json=student_data)
    
    if r.status_code == 200:
        print("Create Student Success!")
        print(r.json())
        student_id = r.json()['id']
    else:
        print(f"Create Student Failed: {r.status_code}")
        print(r.text)

    # 3. Test GET List
    print("\nTesting GET List...")
    r = requests.get(target_url, headers=headers)
    if r.status_code == 200:
        print(f"GET List Success! Found {len(r.json())} students")
    else:
        print(f"GET List Failed: {r.status_code} {r.text}")
        
    # Try WITHOUT slash just to see
    print("\nTesting Create Student (No Slash)...")
    target_url = f"{BASE_URL}/students"
    r = requests.post(target_url, headers=headers, json=student_data)
    print(f"Status: {r.status_code}")

if __name__ == "__main__":
    test_flow()
