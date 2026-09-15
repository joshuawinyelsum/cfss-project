import re

with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add state variables
content = content.replace(
    "  const [isSyncing, setIsSyncing] = useState(false);",
    "  const [isSyncing, setIsSyncing] = useState(false);\n  const [hydrated, setHydrated] = useState(false);\n  const [authVerified, setAuthVerified] = useState(false);"
)

# Replace the old role logic
old_role_logic = '''  useEffect(() => {
    if (!token || !user || user.role === 'admin') return;

    // Sessions created before the admin routing fix can hold a stale
    // 'student' role. Decode the token and kick admins to the admin portal.
    try {
      const role = JSON.parse(atob(token.split('.')[1])).role;
      if (role === 'admin') {
        useAuthStore.getState().setAuth(token, { ...user, role: 'admin' });
        router.replace('/admin');
      }
    } catch (e) {
      // malformed token - let the page's own auth checks handle it
    }
  }, [token, user, router]);'''

new_role_logic = '''  useEffect(() => {
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

content = content.replace(old_role_logic, new_role_logic)

# Replace the final return with the hydration check
old_return = '''  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">'''

new_return = '''  if (!hydrated || !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">'''

content = content.replace(old_return, new_return)

with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("fixed safely")
