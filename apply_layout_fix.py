import re

with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The block to replace:
old_regex = re.compile(r"  useEffect\(\(\) => \{\n    if \(\!token \|\| \!user \|\| user\.role === 'admin'\) return;\n\n    // Sessions created before the admin routing fix can hold a stale\n    // 'student' role\. Decode the token and kick admins to the admin portal\.\n    try \{\n      const role = JSON\.parse\(atob\(token\.split\('\.'\)\[1\]\)\)\.role;\n      if \(role === 'admin'\) \{\n        useAuthStore\.getState\(\)\.setAuth\(token, \{ \.\.\.user, role: 'admin' \}\);\n        router\.replace\('/admin'\);\n      \}\n    \} catch \(e\) \{\n      // malformed token - let the page's own auth checks handle it\n    \}\n  \}, \[token, user, router\]\);", re.MULTILINE)

new_logic = '''  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!token || !user || user.role !== 'student') {
      logout();
      router.push('/login');
      return;
    }

    const verifyToken = async () => {
      try {
        const { api } = await import('@/lib/api');
        await api.get('/api/v2/students/me', {
          headers: { Authorization: Bearer  }
        });
      } catch (err: any) {
        if (err.response?.status === 401) {
          logout();
          router.push('/login');
          return;
        }
      }
      setAuthVerified(true);
    };
    verifyToken();
  }, [hydrated, token, user, logout, router]);'''

if old_regex.search(content):
    content = old_regex.sub(new_logic, content)
    with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully!")
else:
    print("Could not find the block to replace!")
