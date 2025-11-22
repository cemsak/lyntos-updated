from pdf2image import convert_from_path

pdf_path = 'data/luca/beyanname/converted/mizan_beyanname_analiz.pdf'
output_folder = 'data/luca/beyanname/converted/'
png_path = f'{output_folder}mizan_beyanname_analiz.png'

images = convert_from_path(pdf_path)
images[0].save(png_path, 'PNG')  # Sadece ilk sayfa
print(f"PNG dosyası oluşturuldu: {png_path}")