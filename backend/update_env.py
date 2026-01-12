import os

env_path = os.path.join('backend', '.env')
new_key = 'DEEPSEEK_API_KEY=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'

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    with open(env_path, 'w') as f:
        found = False
        for line in lines:
            if line.startswith('DEEPSEEK_API_KEY='):
                f.write(new_key + '\n')
                found = True
            else:
                f.write(line)
        if not found:
            f.write('\n' + new_key + '\n')
    print(f"Updated {env_path}")
else:
    with open(env_path, 'w') as f:
        f.write(new_key + '\n')
    print(f"Created {env_path}")
