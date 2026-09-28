from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib import colors
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.units import mm
import os


def generate_certificate(
    student_name,
    internship_title,
    company_name,
    start_date,
    end_date,
    issue_date,
    certificate_number,
    issued_by
):
    """
    Generate a professional internship certificate PDF.

    Returns:
        str: Path of the generated PDF file.
    """

    # ---------------------------------------------------------
    # Create certificate folder
    # ---------------------------------------------------------

    certificate_folder = "certificates"

    os.makedirs(
        certificate_folder,
        exist_ok=True
    )

    # ---------------------------------------------------------
    # PDF file name
    # ---------------------------------------------------------

    safe_certificate_number = (
        certificate_number
        .replace("/", "_")
        .replace("\\", "_")
        .replace(" ", "_")
    )

    file_name = (
        f"{safe_certificate_number}.pdf"
    )

    file_path = os.path.join(
        certificate_folder,
        file_name
    )

    # ---------------------------------------------------------
    # Page size
    # ---------------------------------------------------------

    page_width, page_height = landscape(A4)

    pdf = canvas.Canvas(
        file_path,
        pagesize=landscape(A4)
    )

    # ---------------------------------------------------------
    # Colors
    # ---------------------------------------------------------

    navy = colors.HexColor(
        "#073B73"
    )

    dark_green = colors.HexColor(
        "#173F2A"
    )

    gold = colors.HexColor(
        "#D4A72C"
    )

    light_gold = colors.HexColor(
        "#E8C85A"
    )

    light_gray = colors.HexColor(
        "#F5F5F5"
    )

    black = colors.HexColor(
        "#111111"
    )

    # ---------------------------------------------------------
    # Background
    # ---------------------------------------------------------

    pdf.setFillColor(colors.white)

    pdf.rect(
        0,
        0,
        page_width,
        page_height,
        fill=1,
        stroke=0
    )

    # ---------------------------------------------------------
    # Outer shadow
    # ---------------------------------------------------------

    pdf.setStrokeColor(
        colors.HexColor("#BBBBBB")
    )

    pdf.setLineWidth(3)

    pdf.rect(
        12 * mm,
        12 * mm,
        page_width - 24 * mm,
        page_height - 24 * mm,
        fill=0,
        stroke=1
    )

    # ---------------------------------------------------------
    # Navy corner blocks
    # ---------------------------------------------------------

    # Top-right

    pdf.setFillColor(navy)

    pdf.rect(
        page_width - 75 * mm,
        page_height - 35 * mm,
        63 * mm,
        23 * mm,
        fill=1,
        stroke=0
    )

    pdf.rect(
        page_width - 25 * mm,
        page_height - 85 * mm,
        13 * mm,
        73 * mm,
        fill=1,
        stroke=0
    )

    # Bottom-left

    pdf.rect(
        12 * mm,
        12 * mm,
        65 * mm,
        22 * mm,
        fill=1,
        stroke=0
    )

    pdf.rect(
        12 * mm,
        12 * mm,
        13 * mm,
        70 * mm,
        fill=1,
        stroke=0
    )

    # ---------------------------------------------------------
    # Gold corner lines
    # ---------------------------------------------------------

    pdf.setStrokeColor(gold)

    pdf.setLineWidth(5)

    # Top-right gold decoration

    pdf.line(
        page_width - 75 * mm,
        page_height - 35 * mm,
        page_width - 60 * mm,
        page_height - 18 * mm
    )

    pdf.line(
        page_width - 60 * mm,
        page_height - 18 * mm,
        page_width - 20 * mm,
        page_height - 18 * mm
    )

    pdf.line(
        page_width - 20 * mm,
        page_height - 18 * mm,
        page_width - 20 * mm,
        page_height - 82 * mm
    )

    # Bottom-left gold decoration

    pdf.line(
        25 * mm,
        82 * mm,
        25 * mm,
        30 * mm
    )

    pdf.line(
        25 * mm,
        30 * mm,
        75 * mm,
        30 * mm
    )

    pdf.line(
        75 * mm,
        30 * mm,
        90 * mm,
        12 * mm
    )

    # ---------------------------------------------------------
    # Decorative top-left corner
    # ---------------------------------------------------------

    pdf.setStrokeColor(gold)
    pdf.setLineWidth(2)

    pdf.line(
        25 * mm,
        page_height - 28 * mm,
        75 * mm,
        page_height - 28 * mm
    )

    pdf.line(
        25 * mm,
        page_height - 28 * mm,
        25 * mm,
        page_height - 75 * mm
    )

    # Decorative circles

    for x, y in [
        (32, 272),
        (42, 272),
        (52, 272),
        (62, 272),
        (32, 262),
        (32, 252)
    ]:

        pdf.setFillColor(gold)

        pdf.circle(
            x * mm,
            y * mm,
            1.5 * mm,
            fill=1,
            stroke=0
        )

    # ---------------------------------------------------------
    # Decorative bottom-right
    # ---------------------------------------------------------

    pdf.setStrokeColor(gold)
    pdf.setLineWidth(2)

    pdf.line(
        page_width - 75 * mm,
        28 * mm,
        page_width - 25 * mm,
        28 * mm
    )

    pdf.line(
        page_width - 25 * mm,
        28 * mm,
        page_width - 25 * mm,
        75 * mm
    )

    # ---------------------------------------------------------
    # Main title
    # ---------------------------------------------------------

    center_x = page_width / 2

    pdf.setFillColor(black)

    pdf.setFont(
        "Times-Bold",
        39
    )

    title = "CERTIFICATE"

    pdf.drawCentredString(
        center_x,
        page_height - 52 * mm,
        title
    )

    # ---------------------------------------------------------
    # Subtitle
    # ---------------------------------------------------------

    pdf.setFillColor(dark_green)

    pdf.setFont(
        "Times-Roman",
        25
    )

    pdf.drawCentredString(
        center_x,
        page_height - 68 * mm,
        "OF INTERNSHIP"
    )

    # ---------------------------------------------------------
    # Decorative line
    # ---------------------------------------------------------

    pdf.setStrokeColor(gold)

    pdf.setLineWidth(1.5)

    pdf.line(
        center_x - 55 * mm,
        page_height - 79 * mm,
        center_x + 55 * mm,
        page_height - 79 * mm
    )

    # Diamond in center

    pdf.setFillColor(black)

    diamond_x = center_x
    diamond_y = page_height - 79 * mm
    diamond_size = 3 * mm

    path = pdf.beginPath()

    path.moveTo(
        diamond_x,
        diamond_y + diamond_size
    )

    path.lineTo(
        diamond_x + diamond_size,
        diamond_y
    )

    path.lineTo(
        diamond_x,
        diamond_y - diamond_size
    )

    path.lineTo(
        diamond_x - diamond_size,
        diamond_y
    )

    path.close()

    pdf.drawPath(
        path,
        fill=1,
        stroke=0
    )

    # ---------------------------------------------------------
    # Award text
    # ---------------------------------------------------------

    pdf.setFillColor(black)

    pdf.setFont(
        "Times-Bold",
        12
    )

    pdf.drawCentredString(
        center_x,
        page_height - 92 * mm,
        "THIS INTERNSHIP PROGRAM"
    )

    pdf.drawCentredString(
        center_x,
        page_height - 101 * mm,
        "CERTIFICATE IS PROUDLY AWARDED TO"
    )

    # ---------------------------------------------------------
    # Student name
    # ---------------------------------------------------------

    pdf.setFillColor(dark_green)

    pdf.setFont(
        "Times-Italic",
        34
    )

    pdf.drawCentredString(
        center_x,
        page_height - 119 * mm,
        student_name
    )

    # ---------------------------------------------------------
    # Line below student name
    # ---------------------------------------------------------

    pdf.setStrokeColor(gold)

    pdf.setLineWidth(1)

    pdf.line(
        center_x - 85 * mm,
        page_height - 125 * mm,
        center_x + 85 * mm,
        page_height - 125 * mm
    )

    # ---------------------------------------------------------
    # Certificate description
    # ---------------------------------------------------------

    pdf.setFillColor(black)

    pdf.setFont(
        "Helvetica",
        11
    )

    description_1 = (
        f"This certificate is proudly awarded to {student_name}"
    )

    description_2 = (
        f"for successful completion of the internship program at {company_name}."
    )

    description_3 = (
        f"Internship: {internship_title}"
    )

    pdf.drawCentredString(
        center_x,
        page_height - 137 * mm,
        description_1
    )

    pdf.drawCentredString(
        center_x,
        page_height - 145 * mm,
        description_2
    )

    pdf.drawCentredString(
        center_x,
        page_height - 153 * mm,
        description_3
    )

    # ---------------------------------------------------------
    # Internship duration
    # ---------------------------------------------------------

    duration_text = (
        f"Duration: {start_date} to {end_date}"
    )

    pdf.setFont(
        "Helvetica-Bold",
        10
    )

    pdf.drawCentredString(
        center_x,
        page_height - 161 * mm,
        duration_text
    )

    # ---------------------------------------------------------
    # Issued by section
    # ---------------------------------------------------------

    left_x = center_x - 65 * mm
    right_x = center_x + 65 * mm

    pdf.setStrokeColor(gold)

    pdf.line(
        left_x - 30 * mm,
        31 * mm,
        left_x + 30 * mm,
        31 * mm
    )

    pdf.line(
        right_x - 30 * mm,
        31 * mm,
        right_x + 30 * mm,
        31 * mm
    )

    pdf.setFillColor(dark_green)

    pdf.setFont(
        "Helvetica-Bold",
        11
    )

    pdf.drawCentredString(
        left_x,
        23 * mm,
        issued_by
    )

    pdf.setFillColor(black)

    pdf.setFont(
        "Helvetica",
        9
    )

    pdf.drawCentredString(
        left_x,
        17 * mm,
        "AUTHORIZED SIGNATORY"
    )

    # ---------------------------------------------------------
    # Certificate number
    # ---------------------------------------------------------

    pdf.setFont(
        "Helvetica-Bold",
        9
    )

    pdf.drawCentredString(
        right_x,
        23 * mm,
        f"Certificate No: {certificate_number}"
    )

    pdf.setFont(
        "Helvetica",
        9
    )

    pdf.drawCentredString(
        right_x,
        17 * mm,
        f"Issue Date: {issue_date}"
    )

    # ---------------------------------------------------------
    # Gold certificate seal
    # ---------------------------------------------------------

    seal_x = center_x
    seal_y = 34 * mm

    pdf.setFillColor(light_gold)

    pdf.circle(
        seal_x,
        seal_y,
        12 * mm,
        fill=1,
        stroke=0
    )

    pdf.setStrokeColor(gold)

    pdf.setLineWidth(2)

    pdf.circle(
        seal_x,
        seal_y,
        9 * mm,
        fill=0,
        stroke=1
    )

    pdf.setFillColor(dark_green)

    pdf.setFont(
        "Helvetica-Bold",
        7
    )

    pdf.drawCentredString(
        seal_x,
        seal_y - 2 * mm,
        "VERIFIED"
    )

    # ---------------------------------------------------------
    # Save PDF
    # ---------------------------------------------------------

    pdf.showPage()

    pdf.save()

    return file_path