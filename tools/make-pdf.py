"""포트폴리오 PDF 만들기 → files/portfolio.pdf

사용법 (저장소 맨 위 폴더에서):
    pip install playwright && python -m playwright install chromium   # 처음 한 번
    python tools/make-pdf.py                 # 실제 DB 내용으로
    python tools/make-pdf.py --data 예시.json  # DB 대신 JSON 파일 내용으로 (get_portfolio 결과와 같은 모양)

portfolio-pdf.html 을 열어 쪽을 다 만든 뒤(A4 가로) PDF로 저장해요.
DB 내용이나 index.html(About Me · 연락처)을 바꾼 뒤 다시 실행하면 돼요.
"""
import argparse, functools, http.server, os, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", help="DB 대신 쓸 get_portfolio JSON 파일")
    ap.add_argument("--out", default=os.path.join(ROOT, "files", "portfolio.pdf"))
    a = ap.parse_args()

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{srv.server_address[1]}/portfolio-pdf.html"

    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1123, "height": 794})
        if a.data:
            body = open(a.data, encoding="utf-8").read()
            pg.route("**/rest/v1/rpc/get_portfolio", lambda r: r.fulfill(status=200, content_type="application/json", body=body))
        pg.goto(url)
        pg.wait_for_selector("html[data-pdf-ready='1']", timeout=30000)
        pg.emulate_media(media="print")
        pg.pdf(path=a.out, width="297mm", height="210mm", print_background=True, prefer_css_page_size=True)
        b.close()
    srv.shutdown()
    print("저장:", os.path.relpath(a.out, ROOT))

if __name__ == "__main__":
    main()
