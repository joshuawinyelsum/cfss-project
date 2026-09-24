import glob
for f in glob.glob('frontend/src/app/surveys/*/fill/page.tsx'):
    with open(f, 'r', encoding='utf-8') as file:
        lines = file.readlines()
        for i, line in enumerate(lines):
            if 'router.' in line:
                print(f"--- Line {i} ---")
                print("".join(lines[max(0, i-5):i+6]))
