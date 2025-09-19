from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # 允许跨域

@app.route('/ping', methods=['GET'])
def ping():
    return {"status": "ok", "service": "python-nlp"}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)