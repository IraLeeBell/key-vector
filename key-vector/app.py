from flask import Flask, render_template, jsonify
import random

app = Flask(__name__)

WORDS = ["HELLO", "WORLD", "MORSE", "CODE", "LEARN", "AUDIO", "SIGNAL"]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/get_word/<mode>")
def get_word(mode):
    if mode == "word":
        word = random.choice(WORDS)
    elif mode == "sentence":
        word = "HELLO WORLD"
    elif mode == "paragraph":
        word = "HELLO WORLD. MORSE CODE IS FUN TO LEARN."
    else:
        word = "ERROR"
    return jsonify({"word": word.upper()})

if __name__ == "__main__":
    app.run(debug=True)
