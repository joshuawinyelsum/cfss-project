with open('tests/test_stabilization.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('PROFILE01', 'PROF999')
with open('tests/test_stabilization.py', 'w', encoding='utf-8') as f:
    f.write(content)
