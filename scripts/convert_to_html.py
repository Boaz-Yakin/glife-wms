import os
import re
import subprocess
import markdown

def convert_md_to_html(md_path, html_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Pre-process mermaid code blocks so they get class="mermaid"
    # match ```mermaid ... ```
    def mermaid_replacer(match):
        code = match.group(1).strip()
        return f'<div class="mermaid">\n{code}\n</div>'

    processed_md = re.sub(r'```mermaid\s+(.*?)\s+```', mermaid_replacer, md_content, flags=re.DOTALL)

    # Convert markdown to html
    html_body = markdown.markdown(
        processed_md,
        extensions=['tables', 'fenced_code', 'nl2br']
    )

    full_html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Glife WMS Barcode System Guide</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({{
            startOnLoad: true,
            theme: 'base',
            themeVariables: {{
                primaryColor: '#e0e7ff',
                primaryTextColor: '#1e1b4b',
                primaryBorderColor: '#6366f1',
                lineColor: '#4f46e5',
                secondaryColor: '#f1f5f9',
                tertiaryColor: '#ffffff'
            }}
        }});
    </script>
    <style>
        @page {{
            size: letter;
            margin: 15mm 14mm 15mm 14mm;
            @bottom-right {{
                content: counter(page);
            }}
        }}

        body {{
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', helvetica, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            font-size: 13px;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}

        h1 {{
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 8px;
            margin-top: 0;
            margin-bottom: 14px;
        }}

        h2 {{
            font-size: 16px;
            font-weight: 700;
            color: #1e3a8a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-top: 24px;
            margin-bottom: 10px;
            page-break-after: avoid;
        }}

        h3 {{
            font-size: 14px;
            font-weight: 700;
            color: #2563eb;
            margin-top: 18px;
            margin-bottom: 8px;
            page-break-after: avoid;
        }}

        h4 {{
            font-size: 13px;
            font-weight: 600;
            color: #334155;
            margin-top: 14px;
            margin-bottom: 6px;
            page-break-after: avoid;
        }}

        p {{
            margin-top: 0;
            margin-bottom: 8px;
        }}

        blockquote {{
            margin: 10px 0;
            padding: 8px 14px;
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            color: #475569;
            font-size: 12px;
            border-radius: 0 6px 6px 0;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 11.5px;
            page-break-inside: avoid;
        }}

        th, td {{
            border: 1px solid #cbd5e1;
            padding: 7px 9px;
            text-align: left;
            vertical-align: middle;
        }}

        th {{
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
        }}

        tr:nth-child(even) td {{
            background-color: #f8fafc;
        }}

        code {{
            font-family: 'Consolas', 'Courier New', monospace;
            background-color: #f1f5f9;
            color: #0f172a;
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 11.5px;
            border: 1px solid #e2e8f0;
        }}

        pre {{
            background-color: #0f172a;
            color: #f8fafc;
            padding: 12px 14px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 11px;
            line-height: 1.45;
            margin: 10px 0;
            page-break-inside: avoid;
        }}

        pre code {{
            background-color: transparent;
            color: inherit;
            padding: 0;
            border: none;
            font-size: inherit;
        }}

        .mermaid {{
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px;
            margin: 14px 0;
            text-align: center;
            page-break-inside: avoid;
        }}

        hr {{
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 20px 0;
        }}

        ul, ol {{
            margin-top: 0;
            margin-bottom: 8px;
            padding-left: 20px;
        }}

        li {{
            margin-bottom: 4px;
        }}

        strong {{
            color: #0f172a;
        }}
    </style>
</head>
<body>
    {html_body}
</body>
</html>
"""
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(full_html)
    print(f"Generated HTML at {html_path}")

if __name__ == "__main__":
    md_file = r"c:\Users\boazn\Projects\WMS\WMS_APP\docs\Barcode System Guide.md"
    html_file = r"c:\Users\boazn\Projects\WMS\WMS_APP\scripts\preview.html"
    pdf_file = r"c:\Users\boazn\Projects\WMS\WMS_APP\docs\Barcode System Guide.pdf"
    convert_md_to_html(md_file, html_file)

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        f"--print-to-pdf={pdf_file}",
        f"file:///{html_file.replace('\\', '/')}"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(f"Generated PDF (Letter size) at {pdf_file}, returncode: {res.returncode}")
