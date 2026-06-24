"""PDF Report Export — converts markdown report to PDF using fpdf2."""

import io
import os
import re
from datetime import datetime
from io import BytesIO
from fpdf import FPDF

FONT_DIR = "/usr/share/fonts/truetype"
FONT_REGULAR = os.path.join(FONT_DIR, "noto", "NotoSans-Regular.ttf")
FONT_BOLD = os.path.join(FONT_DIR, "noto", "NotoSans-Bold.ttf")
FONT_ITALIC = os.path.join(FONT_DIR, "noto", "NotoSans-Italic.ttf")

if not os.path.exists(FONT_REGULAR):
    FONT_REGULAR = os.path.join(FONT_DIR, "dejavu", "DejaVuSans.ttf")
    FONT_BOLD = os.path.join(FONT_DIR, "dejavu", "DejaVuSans-Bold.ttf")
    FONT_ITALIC = FONT_REGULAR

CHART_COLORS = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d']


class ReportPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Noto", "I", 8)
            self.set_text_color(100, 100, 100)
            self.cell(90, 6, "DAVictory - Bao cao AI", align="L")
            self.cell(90, 6, f"Trang {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(200, 200, 200)
            self.line(10, 14, 200, 14)
            self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Noto", "", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, f"Tao luc {datetime.now().strftime('%d/%m/%Y %H:%M')}", align="C")


def _generate_bar_chart_png(data: list, title: str) -> BytesIO:
    """Generate a bar chart PNG using Pillow."""
    try:
        from PIL import Image, ImageDraw, ImageFont

        w, h = 500, 250
        img = Image.new("RGB", (w, h), "white")
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
            font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
        except Exception:
            font = ImageFont.load_default()
            font_bold = font

        max_val = max(d.get("value", 0) for d in data) or 1
        pad_l, pad_r, pad_t, pad_b = 80, 20, 30, 20
        chart_w = w - pad_l - pad_r
        chart_h = h - pad_t - pad_b
        items = data[:8]
        bar_h = max(15, min(30, (chart_h - len(items) * 4) / len(items)))

        # Title
        draw.text((pad_l, 6), title, fill="#374151", font=font_bold)

        for i, d in enumerate(items):
            val = d.get("value", 0)
            bw = max((val / max_val) * chart_w, 2)
            by = pad_t + i * (bar_h + 4)
            color = CHART_COLORS[i % len(CHART_COLORS)]
            # Draw bar
            draw.rectangle([pad_l, by, pad_l + bw, by + bar_h], fill=color, outline=None)
            # Draw label
            label = d.get("label", "")[:20]
            draw.text((pad_l - 4, by + 2), label, fill="#333", font=font, anchor="rt")
            # Draw value
            draw.text((pad_l + bw + 4, by + 2), str(val), fill="#555", font=font)

        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf
    except Exception as e:
        print(f"Chart generation error: {e}")
        return None


def _generate_donut_chart_png(data: list, title: str) -> BytesIO:
    """Generate a donut chart PNG using Pillow."""
    try:
        from PIL import Image, ImageDraw, ImageFont

        size = 300
        img = Image.new("RGB", (size, 250), "white")
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
            font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
        except Exception:
            font = font_bold = ImageFont.load_default()

        total = sum(d.get("value", 0) for d in data) or 1
        cx, cy, radius = 80, 120, 60
        draw.text((10, 6), title, fill="#374151", font=font_bold)

        # Draw arc segments
        from PIL import ImageDraw as dw
        start_angle = 90
        for i, d in enumerate(data):
            pct = d.get("value", 0) / total
            end_angle = start_angle + pct * 360
            color = CHART_COLORS[i % len(CHART_COLORS)]
            draw.arc([cx - radius, cy - radius, cx + radius, cy + radius], start_angle, end_angle, fill=color, width=20)
            start_angle = end_angle

        # Center text
        first_pct = round((data[0].get("value", 0) / total) * 100) if data else 0
        draw.text((cx - 10, cy - 6), f"{first_pct}%", fill="#333", font=font_bold)

        # Legend
        ly = 180
        for i, d in enumerate(data[:5]):
            color = CHART_COLORS[i % len(CHART_COLORS)]
            draw.rectangle([10, ly + i * 16, 22, ly + i * 16 + 10], fill=color)
            draw.text((28, ly + i * 16), f"{d.get('label', '')}: {d.get('value', '')}", fill="#555", font=font)

        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf
    except Exception as e:
        print(f"Donut chart error: {e}")
        return None


def markdown_to_pdf(md_text: str, chart_groups: list = None) -> BytesIO:
    pdf = ReportPDF()
    pdf.add_font("Noto", "", FONT_REGULAR, uni=True)
    pdf.add_font("Noto", "B", FONT_BOLD, uni=True)
    pdf.add_font("Noto", "I", FONT_ITALIC, uni=True)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # Title page
    pdf.set_font("Noto", "B", 22)
    pdf.set_text_color(37, 99, 235)
    pdf.ln(30)
    pdf.cell(0, 14, "BAO CAO AI", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Noto", "", 12)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, "He thong Multi-Agent DAVictory", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(20)
    pdf.set_draw_color(37, 99, 235)
    pdf.line(40, pdf.get_y(), 170, pdf.get_y())
    pdf.ln(10)
    pdf.set_font("Noto", "", 10)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 7, f"Ngay xuat: {datetime.now().strftime('%d/%m/%Y')}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, "Don vi: Cong ty TNHH DAVictory", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.add_page()

    # Parse markdown lines
    lines = md_text.split("\n")
    in_table = False
    table_data = []
    table_cols = 0

    for line in lines:
        stripped = line.strip()

        # ━━━ separator
        if re.match(r'━{3,}', stripped):
            pdf.ln(3)
            pdf.set_draw_color(37, 99, 235)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(3)
            continue

        # Heading h2
        h2 = re.match(r'^##\s+(.+)', stripped)
        if h2:
            if in_table:
                _draw_table(pdf, table_data)
                table_data = []
                in_table = False
            pdf.ln(4)
            pdf.set_font("Noto", "B", 14)
            pdf.set_text_color(37, 99, 235)
            # Check if it has emoji prefix
            text = re.sub(r'^[📊📈💡🎯🎤👤👨‍🏫🏫📝]{1,2}\s*', '', h2.group(1))
            pdf.cell(0, 8, text, new_x="LMARGIN", new_y="NEXT")
            pdf.set_draw_color(37, 99, 235)
            pdf.line(10, pdf.get_y(), 110, pdf.get_y())
            pdf.ln(3)
            continue

        # Bold text (like **INSIGHT**)
        bold_match = re.match(r'^\*\*(.+)\*\*$', stripped)
        if bold_match:
            if in_table:
                _draw_table(pdf, table_data)
                table_data = []
                in_table = False
            pdf.set_x(10)
            pdf.set_font("Noto", "B", 11)
            pdf.set_text_color(30, 41, 59)
            pdf.cell(0, 7, bold_match.group(1), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
            continue

        # Table row
        if stripped.startswith("|") and stripped.endswith("|"):
            # Separator row
            if re.match(r'^\|[\s\-:]+\|$', stripped.replace("|", " | ")):
                continue
            cells = [c.strip() for c in stripped.split("|") if c.strip()]
            if cells:
                table_cols = max(table_cols, len(cells))
                table_data.append(cells)
                in_table = True
            continue
        else:
            if in_table:
                _draw_table(pdf, table_data)
                table_data = []
                in_table = False

        # List item
        li = re.match(r'^-\s+(.+)', stripped)
        if li:
            text = _fmt_inline(li.group(1))
            pdf.set_x(10)
            pdf.set_font("Noto", "", 10)
            pdf.set_text_color(30, 41, 59)
            pdf.multi_cell(0, 6, "  - " + text)
            continue

        # Empty line
        if not stripped:
            pdf.ln(2)
            continue

        # Regular paragraph
        text = _fmt_inline(stripped)
        if text:
            pdf.set_x(10)
            pdf.set_font("Noto", "", 10)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(0, 5.5, text)
            pdf.ln(1)

    if in_table:
        _draw_table(pdf, table_data)

    # Embed charts
    if chart_groups:
        for cg in chart_groups:
            cg_type = cg.get("type", "")
            cg_data = cg.get("data", [])
            cg_title = cg.get("title", "")
            if not cg_data:
                continue
            pdf.ln(4)
            pdf.set_font("Noto", "B", 10)
            pdf.set_text_color(37, 99, 235)
            pdf.cell(0, 7, _sanitize(cg_title), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)
            if cg_type == "bar":
                img_buf = _generate_bar_chart_png(cg_data, cg_title)
                if img_buf:
                    try:
                        pdf.image(img_buf, x=10, w=170)
                        pdf.ln(4)
                    except Exception:
                        pass
            elif cg_type == "donut":
                img_buf = _generate_donut_chart_png(cg_data, cg_title)
                if img_buf:
                    try:
                        pdf.image(img_buf, x=10, w=150)
                        pdf.ln(4)
                    except Exception:
                        pass

    buf = BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return buf


def _fmt_inline(text: str) -> str:
    """Remove markdown formatting and emoji for PDF display."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'[^\x00-\x7F\u00C0-\u1EF9]+', '', text)  # Keep ASCII + Vietnamese, remove emoji
    return text.strip()


def _sanitize(text: str) -> str:
    """Remove characters that may cause PDF rendering issues."""
    text = re.sub(r'[^\x00-\x7F\u00C0-\u1EF9\s\.\,\-\%\(\)\+]', '', text)
    return text.strip()


def _draw_table(pdf, data):
    if not data:
        return
    pdf.set_font("Noto", "B", 9)
    col_w = max(min(175 / max(len(data[0]), 1), 40), 20)
    pdf.set_fill_color(37, 99, 235)
    pdf.set_text_color(255, 255, 255)
    for cell in data[0]:
        text = _sanitize(cell)[:15]
        pdf.cell(col_w, 7, text, border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_font("Noto", "", 8)
    pdf.set_text_color(50, 50, 50)
    fill = False
    for row in data[1:]:
        if fill:
            pdf.set_fill_color(248, 250, 252)
        else:
            pdf.set_fill_color(255, 255, 255)
        for cell in row[:len(data[0])]:
            text = _sanitize(cell)[:15]
            pdf.cell(col_w, 6, text, border=1, fill=True, align="C")
        pdf.ln()
        fill = not fill
    pdf.ln(4)
