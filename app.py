"""
Flask backend for Date Night Picker. Serves the local BM25 index — no external search API.

    pip install -r requirements.txt
    python app.py            # http://127.0.0.1:5000  (the Vite dev server proxies /api here)

Env vars: MAX_BIZ (default 3000), MAX_PER reviews per restaurant (20),
EMBED_MODEL (e.g. all-MiniLM-L6-v2 to turn on sentence-embedding matching).
"""
import os

from flask import Flask, abort, jsonify, request, send_from_directory

from datastore import Store

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "frontend", "dist")

app = Flask(__name__, static_folder=None)
store = Store(ROOT)


@app.get("/api/meta")
def meta():
    return jsonify(store.info())


@app.post("/api/rank")
def rank():
    body = request.get_json(force=True) or {}
    return jsonify(store.rank(body.get("prefs") or {}, k=int(body.get("k", 30)), free_text=body.get("q", "")))


@app.get("/api/search")
def search():
    a = request.args
    return jsonify(store.search(a.get("q", ""), k=int(a.get("k", 30)), city=a.get("city") or None,
                                cuisine=a.get("cuisine") or None, price=int(a["price"]) if a.get("price") else None))


@app.post("/api/restaurant/<path:rid>")
def restaurant(rid):
    item = store.one(rid, (request.get_json(silent=True) or {}).get("prefs"))
    if item is None:
        abort(404)
    return jsonify(item)


@app.get("/api/lookup")
def lookup():
    return jsonify(store.lookup(request.args.get("q", ""), k=int(request.args.get("k", 8))))


# serve the built frontend (npm run build) so one process runs the whole app
@app.get("/", defaults={"path": ""})
@app.get("/<path:path>")
def spa(path):
    if not os.path.isdir(DIST):
        return "Frontend not built. Run `npm run dev` in frontend/ or `npm run build`.", 404
    full = os.path.join(DIST, path)
    return send_from_directory(DIST, path if path and os.path.isfile(full) else "index.html")


if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)), debug=False)
