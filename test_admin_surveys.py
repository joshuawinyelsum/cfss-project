import httpx

def main():
    base_url = "http://localhost:8000"
    
    # 1. Login as admin
    login_data = {
        "username": "admin",
        "password": "adminpassword"
    }
    
    with httpx.Client() as client:
        print("Logging in as admin...")
        res = client.post(f"{base_url}/api/auth/admin/login", data=login_data)
        if res.status_code != 200:
            print("Login failed:", res.text)
            return
            
        token = res.json()["access_token"]
        print("Logged in successfully.")
        
        # 2. Fetch surveys
        print("Fetching surveys...")
        headers = {"Authorization": f"Bearer {token}"}
        res = client.get(f"{base_url}/api/admin/surveys", headers=headers)
        
        if res.status_code != 200:
            print("Failed to fetch surveys:", res.text)
            return
            
        surveys = res.json()
        print(f"Fetched {len(surveys)} surveys.")
        if surveys:
            print("First survey:", surveys[0])

if __name__ == "__main__":
    main()

