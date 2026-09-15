with open('frontend/src/app/dashboard/layout.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if "user.role === 'admin'" in line:
        start = i - 1
    if start != -1 and "}, [token, user, router]);" in line:
        end = i
        break

if start != -1 and end != -1:
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
  }, [hydrated, token, user, logout, router]);
'''
    del lines[start:end+1]
    lines.insert(start, new_logic)
    with open('frontend/src/app/dashboard/layout.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Replaced by slicing successfully!")
else:
    print("Could not find start/end")
