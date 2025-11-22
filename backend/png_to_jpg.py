from PIL import Image

png_path = 'data/luca/beyanname/converted/mizan_beyanname_analiz.png'
jpg_path = 'data/luca/beyanname/converted/mizan_beyanname_analiz.jpg'

im = Image.open(png_path)
rgb_im = im.convert('RGB')
rgb_im.save(jpg_path, quality=95)
print(f"JPG dosyası oluşturuldu: {jpg_path}")