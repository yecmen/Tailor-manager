import re

file_path = 'src/App.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace padding
content = re.sub(r'\bp-12\b', 'p-6', content)
content = re.sub(r'\bp-10\b', 'p-5', content)
content = re.sub(r'\bp-8\b', 'p-4', content)
content = re.sub(r'\bp-6\b', 'p-4', content)

# Replace text sizes
content = re.sub(r'\btext-7xl\b', 'text-5xl', content)
content = re.sub(r'\btext-5xl\b', 'text-3xl', content)
content = re.sub(r'\btext-4xl\b', 'text-2xl', content)
content = re.sub(r'\btext-3xl\b', 'text-xl', content)
content = re.sub(r'\btext-2xl\b', 'text-lg', content)

# Change max-widths to full width with safe padding
content = re.sub(r'\bmax-w-4xl\b', 'w-full max-w-full px-4', content)
content = re.sub(r'\bmax-w-5xl\b', 'w-full max-w-full px-4', content)
content = re.sub(r'\bmax-w-3xl\b', 'w-full max-w-full px-4', content)

# Buttons should take full width on mobile if they don't already
# The main menu buttons already have w-full.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("App.jsx has been adapted for mobile screens.")
