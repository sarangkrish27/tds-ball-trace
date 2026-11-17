# BallTrace

Upload your bouncing-balls video, enter the three frame numbers from your question, and BallTrace tells you:

1. the **number printed on your ball** at the end, and
2. your ball's **centre `x,y`** at each of the three frames.

Output format (matches the question):

```
Number; x1,y1; x2,y2; x3,y3
```

## The puzzle

100 balls bounce around inside a circle. At the start, one ball is red. It turns grey like all the others and the balls start colliding. When they stop, a number (1–100) appears on each ball. The task is to find the number on the originally red ball, plus its centre at three given frames. Every student's video is unique.

- Frames count from **0**.
- Pixels count from the **top-left** corner.

## How it works

All balls look identical once the red one turns grey, so BallTrace follows the red ball continuously from the first frame to the last:

1. **Decode** every frame of the `.webm` (480×480, 30 fps).
2. **Find the red ball** in frame 0.
3. **Detect all 100 balls** in every frame and compute sub-pixel centres.
4. **Track** each ball frame to frame (velocity prediction plus optimal assignment), so identities survive collisions.
5. **Read the final numbers** on the stopped balls (OCR) and look up the one belonging to the tracked ball.
6. **Report** the number and the ball's centre at your three frames.

### Self-checks

- Exactly 100 balls detected in every frame.
- No impossible jumps in position between frames.
- The recognised numbers form each of 1..100 exactly once.

## Using the website

1. Open **http://localhost:5174**.
2. Upload your `.webm` video.
3. Enter the three frame numbers from your question.
4. Click **Track**.
5. Copy the result line, and use the annotated images to double-check the ball it picked.

## Running locally

> Adjust the commands below to match your project layout.

```bash
# clone
git clone <your-repo-url>
cd balltrace

# backend
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py

# frontend (new terminal)
cd frontend
npm install
npm run dev                      # serves on http://localhost:5174
```

## Tech stack

- **Frontend:** Vue.js
- **Backend:** Python (Flask), OpenCV, NumPy, SciPy
- **OCR:** digit recognition on the final frame

## Tips and troubleshooting

- Use the original `.webm` file, not a re-encoded copy, so frame numbers stay exact.
- Frame numbers are 0-based: the first frame is `0`.
- If the result looks wrong, check the annotated frames. A highlighted ball in the wrong place means tracking drifted.
- If the number check fails, re-upload the video and try again.

## Project structure

```
balltrace/
├── backend/     # video decoding, detection, tracking, OCR, API
├── frontend/    # upload form and results page
└── README.md
```

## Author

Built by Sarang for fellow IIT Madras BS students.
