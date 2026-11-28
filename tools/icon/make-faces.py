# The round face pictures on the start page (Adam, Baby Ais): head crops from the art references.
#   python3 tools/icon/make-faces.py
from PIL import Image
def face(src, box, out, bg=(255, 255, 255)):
    im = Image.open(src).convert('RGBA').crop(box)
    s = max(im.size); sq = Image.new('RGBA', (s, s), bg + (255,))
    sq.alpha_composite(im, ((s - im.width) // 2, (s - im.height) // 2))
    sq.convert('RGB').resize((256, 256), Image.LANCZOS).save(out, quality=90)
    print(out)
# Adam: the front view of his model sheet (its backdrop is dark: keep only the head over white)
face('art/reference/adam-turnaround.png', (45, 15, 545, 515), 'public/img/adam-face.webp')
face('art/reference/baby-ais-run.png', (20, -50, 800, 730), 'public/img/ais-face.webp')
