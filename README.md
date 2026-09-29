# PureMedia

PureMedia is a local-first media privacy and creator toolkit. It works on a new copy of the selected file and keeps the original untouched.

## Current features

- Image inspection and cleaned-copy workflow
- Video inspection for MP4/MOV/M4V/WebM
- EXIF / XMP / IPTC marker inspection
- C2PA / Content Credentials marker inspection
- Supported MP4-family C2PA UUID container processing without re-encoding the A/V streams when the layout is supported
- Fixed-position visible video-watermark processing using a user-selected region and frame-by-frame canvas processing
- Before/after verification state
- Progress reporting for video processing
- Mobile-responsive interface
- Four-layer signal model:
  1. EXIF / XMP / IPTC — ordinary metadata
  2. C2PA / Content Credentials — signed provenance data
  3. Visible watermark — pixels/frames that require visual processing
  4. Invisible watermark — pixel/frame-level signals such as SynthID-style systems

## Invisible watermark limitation

PureMedia intentionally does **not** provide a universal invisible-AI-watermark remover or a feature intended to bypass AI-content detection or platform labeling. Invisible watermark systems are signal-specific and are fundamentally different from ordinary metadata. A metadata-cleaned file can still contain an invisible pixel/frame signal.

## Visible watermark processing

The video tool can process a user-selected, fixed-position visible overlay and export a new browser-generated video where the selected region is visually processed. This is separate from C2PA or invisible watermark handling.

## Privacy model

- Browser/local processing is used where the browser supports the operation.
- The original file is not modified.
- No server upload is required by the static application.
- The UI does not claim that cleaning metadata guarantees any particular social-platform classification.

## Run locally

```powershell
cd C:\Users\LOQ\PureMedia
python -m http.server 5500
```

Open `http://localhost:5500`.

## Notes

C2PA can appear in different container layouts, and not every provenance structure is a simple top-level MP4 UUID box. Segment-based/live-video layouts and signal-specific invisible watermark systems require specialized processing and are not treated as universally removable by PureMedia.
