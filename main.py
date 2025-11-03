from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index_page():
    return render_template("index.html")
@app.route("/plans")
def plans_page():
    return render_template("plans.html")

app.run(debug=True)