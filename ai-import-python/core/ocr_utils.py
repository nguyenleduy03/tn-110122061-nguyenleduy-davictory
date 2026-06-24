"""OCR utilities with table detection via bounding box analysis."""

import io
import os
from pathlib import Path

from loguru import logger

_TESS_DATA = Path.home() / "tesseract_install"
_TESS_BIN = _TESS_DATA / "bin" / "tesseract"
_TESS_LIB = _TESS_DATA / "lib"
_TESSDATA = _TESS_DATA / "share" / "tesseract-ocr" / "5" / "tessdata"


def _setup_tesseract():
    if _TESS_BIN.exists():
        os.environ.setdefault("LD_LIBRARY_PATH", str(_TESS_LIB))
        os.environ.setdefault("TESSDATA_PREFIX", str(_TESSDATA))
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = str(_TESS_BIN)
        return pytesseract
    import pytesseract
    return pytesseract


def ocr_with_table_detection(image, ocr_language: str, min_rows: int = 3) -> str:
    """OCR an image, detect tables from word bounding boxes, return text with markdown tables."""
    try:
        pytesseract = _setup_tesseract()
    except ImportError:
        logger.error("pytesseract not installed")
        return ""

    raw_text = pytesseract.image_to_string(
        image, lang=ocr_language, config="--psm 6 --oem 3"
    ).strip()

    raw_text = _fix_ocr_artifacts(raw_text)

    table_md = _detect_table_from_data(image, pytesseract, ocr_language, min_rows)
    if table_md:
        return raw_text + "\n\n" + table_md
    return raw_text


def _fix_ocr_artifacts(text: str) -> str:
    """Fix common OCR artifacts: garbled blanks misread as letters."""
    import re
    text = re.sub(r'\b[nmuw]{4,}\b', '......', text)
    text = re.sub(r'([nmuw])\1{3,}', '......', text)
    return text


def _detect_table_from_data(image, pytesseract, ocr_language: str, min_rows: int = 3) -> str:
    """Use tesseract word-level bounding boxes to detect and reconstruct tables."""
    try:
        data = pytesseract.image_to_data(
            image, lang=ocr_language, config="--psm 6 --oem 3",
            output_type=pytesseract.Output.DICT
        )
    except Exception as e:
        logger.warning(f"Table detection data failed: {e}")
        return ""

    n = len(data.get("text", []))
    if n < 20:
        return ""

    words = []
    for i in range(n):
        text = (data["text"][i] or "").strip()
        conf = int(data["conf"][i]) if data["conf"][i] != "-1" else 0
        if text and conf > 30:
            words.append({
                "text": text,
                "x": data["left"][i],
                "y": data["top"][i],
                "w": data["width"][i],
                "h": data["height"][i],
                "line": data["line_num"][i],
                "block": data["block_num"][i],
            })

    if len(words) < min_rows * 2:
        return ""

    words.sort(key=lambda w: (w["y"], w["x"]))

    rows = []
    current_row = []
    current_y = words[0]["y"]
    y_threshold = max(12, words[0]["h"] // 2)

    for w in words:
        if abs(w["y"] - current_y) > y_threshold:
            if current_row:
                rows.append(current_row)
            current_row = [w]
            current_y = w["y"]
        else:
            current_row.append(w)
    if current_row:
        rows.append(current_row)

    if len(rows) < min_rows:
        return ""

    col_counts = [len(r) for r in rows]
    median_cols = sorted(col_counts)[len(col_counts) // 2]
    if median_cols < 2:
        return ""

    clean_rows = [r for r in rows if abs(len(r) - median_cols) <= 1]
    if len(clean_rows) < min_rows:
        return ""

    if median_cols > 6:
        return ""

    single_word_ratio = sum(
        sum(1 for w in row if len(w["text"]) < 6) / len(row)
        for row in clean_rows
    ) / len(clean_rows)
    if single_word_ratio > 0.7:
        return ""

    lines = []
    for ri, row in enumerate(clean_rows):
        row.sort(key=lambda w: w["x"])
        cells = [w["text"] for w in row]
        while len(cells) < median_cols:
            cells.append("")
        line = " | ".join(cells)
        lines.append(line)
        if ri == 0:
            lines.append(" | ".join(["---"] * median_cols))

    logger.info(f"Table detection: reconstructed {len(clean_rows)} rows x {median_cols} cols")
    return "[Table from OCR]\n" + "\n".join(lines)
