import re

with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add hydrated, authVerified state variables
state_vars = '''  const [isSyncing, setIsSyncing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [authVerified, setAuthVerified] = useState(false);'''
content = re.sub(r'  const \[isSyncing, setIsSyncing\] = useState\(false\);', state_vars, content)

# 2. Add hydration and auth verification effects, and replace the old role redirect logic
old_role_logic_regex = r'  useEffect\(\(\) => \{\n    if \(!token \|\| !user \|\| user\.role === \'admin\'\) return;[\s\S]*?  \}, \[token, user, router\]\);'

new_auth_logic = '''  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!token || !user || user.role !== 'student') {
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

content = re.sub(old_role_logic_regex, new_auth_logic, content)

# 3. Add loading spinner if not hydrated or verified
render_logic = '''  if (!hydrated || !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return ('''
content = re.sub(r'  return \(', render_logic, content, count=1)

with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('dashboard/layout.tsx auth logic merged')
