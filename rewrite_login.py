import re

with open('frontend/src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_effect = '''  const [hydrated, setHydrated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const verify = async () => {
      if (token && user) {
        if (user.role === 'admin') {
          router.push('/admin');
          return;
        }

        setIsVerifying(true);
        try {
          // Verify token is still valid. If offline, it throws a network error (no response)
          // and we still allow them to proceed offline.
          await api.get('/api/v2/students/me', {
            headers: { Authorization: \Bearer \\ }
          });
          router.push('/dashboard');
        } catch (err: any) {
          if (err.response?.status === 401) {
            useAuthStore.getState().logout();
            setIsVerifying(false);
          } else {
            // Network error (offline) or server error - assume token is valid enough for offline DB
            router.push('/dashboard');
          }
        }
      }
    };
    
    verify();
    setRegistered(new URLSearchParams(window.location.search).get('registered') === 'true');
  }, [hydrated, token, user, router]);

  if (!hydrated || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-4 border-cfss-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
'''

content = re.sub(r'  useEffect\(\(\) => \{[\s\S]*?\}, \[token, user, router\]\);', new_effect, content)

with open('frontend/src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
