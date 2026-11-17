# Ball Trace

A browser-only WebM tracker for 100 outlined grey balls on a light background, with one red ball in frame zero. Videos stay on the visitor's device. Desktop Chrome or Edge is recommended (WebCodecs is required).

## Develop

Run `npm ci`, `npm test`, and `npm run build`. Serve `dist` using a static HTTP server; production hosting must use HTTPS. The committed `.openai/hosting.json` identifies the Sites deployment. No server, account, API key, or video upload endpoint is needed.

## How it works

Mediabunny decodes frames in presentation order; indices start at zero. Pixel segmentation detects ball interiors, with a morphological erosion fallback for compressed touching edges. If both passes fail, a distance-transform circle detector separates connected balls and fills small number-label holes. It combines recovered centres with valid interior centroids, without inventing positions from previous frames. A minimum-cost global one-to-one assignment follows all balls. A velocity-based assignment supplies a disagreement check, and a reverse pass verifies the target path. Coordinates are interior centroids or recovered circle centres in original video pixels, rounded to whole pixels. A 3×5 pixel-glyph reader recognizes the sample's final number style; users can inspect or correct that number.

The result format is `number; x,y; x,y; x,y`, in the same order as the frame inputs.

## Limits

This is an estimated visual tracker, not a proof of identity. Identical balls, large motion between frames, occlusion, different colors or label fonts, edits, and compression may cause failure or ambiguity. Count mismatches stop processing rather than return a fabricated answer. Motion or reverse disagreements are flagged for review. Passing consistency checks does not guarantee the correct identity. The UI includes frame review and the enlarged final label.

Files are limited to 100 MB and 1920×1080 pixels. Detection thresholds and ball size scaling are tuned to the supplied 480×480 sample. External font loading is cosmetic; all video computation is local.

## Validation

The supplied sample decoded to 722 frames. All 100 balls were detected in every frame (one needed erosion), all final labels were recognized as the unique numbers 1–100, and both motion and reverse checks agreed with the target path. There is no supplied ground-truth answer, so these are consistency checks, not an independent accuracy measurement.
