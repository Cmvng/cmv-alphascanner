import sys
from PIL import Image
d, out, ts = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
ims = [Image.open(f'{d}/still_{t}.png').convert('RGB').resize((360, 640)) for t in ts]
s = Image.new('RGB', (360 * len(ims), 640)); [s.paste(im, (i * 360, 0)) for i, im in enumerate(ims)]; s.save(out, quality=85)
