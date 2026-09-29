# PureMedia v6

Image + video C2PA cleaner prototype.

### Video
For ISO BMFF/MP4-family files, the tool recognizes the C2PA-defined `uuid` extended type and removes matching top-level C2PA provenance boxes without re-encoding the audio/video streams. The C2PA specification defines this UUID for BMFF assets. See the C2PA technical specification.

### Four layers
1. EXIF / XMP / IPTC — ordinary metadata
2. C2PA / Content Credentials — signed provenance
3. Visible watermark — actual pixels/frames
4. Invisible watermark / SynthID-type signal — pixel/frame-level signal, not ordinary metadata

### Important
This does not claim universal invisible-watermark removal. Segment-based/live-video C2PA and other container layouts require additional processing.

### Run
```powershell
cd C:\Users\LOQ\PureMedia-New
python -m http.server 5500
```
Open http://localhost:5500
