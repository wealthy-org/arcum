import os
from PIL import Image, ImageDraw, ImageFont

def create_pwa_icon(size: int, output_path: str, maskable: bool = False):
    # Create image with dark background
    bg_color = (3, 7, 18, 255) # #030712
    img = Image.new("RGBA", (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # Padding calculation
    padding = int(size * (0.15 if maskable else 0.1))
    box_size = size - (padding * 2)

    # Draw rounded gradient box or emblem
    corner_radius = int(size * 0.2)
    x0, y0 = padding, padding
    x1, y1 = size - padding, size - padding

    # Outer border / glow ring
    for i in range(max(1, int(size * 0.02))):
        alpha = int(180 - (i * 30))
        draw.rounded_rectangle(
            [x0 - i, y0 - i, x1 + i, y1 + i],
            radius=corner_radius + i,
            outline=(25, 230, 255, max(0, alpha)),
            width=1
        )

    # Inner emblem box
    draw.rounded_rectangle(
        [x0, y0, x1, y1],
        radius=corner_radius,
        fill=(10, 16, 32, 255),
        outline=(43, 75, 255, 255),
        width=max(2, int(size * 0.03))
    )

    # Draw letter 'A'
    font_size = int(box_size * 0.65)
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = "A"
    # Measure text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    tx = (size - text_w) // 2 - bbox[0]
    ty = (size - text_h) // 2 - bbox[1]

    # Cyan text with subtle glow
    draw.text((tx, ty), text, font=font, fill=(25, 230, 255, 255))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Generated {output_path} ({size}x{size})")

def main():
    icons_dir = "web/public/icons"
    os.makedirs(icons_dir, exist_ok=True)
    create_pwa_icon(192, f"{icons_dir}/icon-192.png")
    create_pwa_icon(512, f"{icons_dir}/icon-512.png")
    create_pwa_icon(512, f"{icons_dir}/icon-maskable-512.png", maskable=True)
    create_pwa_icon(180, f"{icons_dir}/apple-touch-icon.png")

if __name__ == "__main__":
    main()
