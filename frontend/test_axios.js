const axios = require('axios');
const http = require('http');

async function test() {
    // 1. Get token
    const res = await axios.post("http://127.0.0.1:8000/api/auth/admin/login", 
        "username=admin&password=admin123", 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }}
    );
    const token = res.data.access_token;
    console.log("Token:", token.substring(0, 20) + "...");

    // 2. Export students
    try {
        console.log("Fetching /admin/export/students...");
        const exp = await axios.get("http://127.0.0.1:8000/admin/export/students", {
            responseType: "blob",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Status:", exp.status);
    } catch (e) {
        console.log("Error:", e.message);
    }
}

test();
