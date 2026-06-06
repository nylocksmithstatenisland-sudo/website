import os
import re

base_dir = r"c:\Users\Just Web Support LLC\locksmithstatenisland.nyc"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Strip .html from href attributes for internal links
    # Matches href="/path/page.html" or href="https://www.locksmithstatenisland.nyc/path/page.html"
    content = re.sub(
        r'(href="(?:/|https?://(?:www\.)?locksmithstatenisland\.nyc/)(?:[^"]*?))\.html(")',
        r'\1\2',
        content
    )

    # 2. Strip .html from canonical and og:url meta content
    content = re.sub(
        r'(content="https?://(?:www\.)?locksmithstatenisland\.nyc/(?:[^"]*?))\.html(")',
        r'\1\2',
        content
    )

    # 3. Strip .html from <loc> in sitemap
    content = re.sub(
        r'(<loc>https?://(?:www\.)?locksmithstatenisland\.nyc/(?:[^<]*?))\.html(</loc>)',
        r'\1\2',
        content
    )

    # 4. Strip .html from action attributes in forms
    content = re.sub(
        r'(action="(?:/|https?://(?:www\.)?locksmithstatenisland\.nyc/)(?:[^"]*?))\.html(")',
        r'\1\2',
        content
    )

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {os.path.relpath(filepath, base_dir)}")

# Walk all .html files and sitemap.xml
updated = 0
for root, dirs, files in os.walk(base_dir):
    # Skip .git and node_modules
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', '__pycache__')]
    for file in files:
        if file.endswith('.html') or file == 'sitemap.xml':
            process_file(os.path.join(root, file))
            updated += 1

print(f"\nDone. Processed {updated} files.")
