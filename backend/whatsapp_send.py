import pywhatkit

dosya_yolu = 'data/luca/beyanname/converted/mizan_beyanname_analiz.png'
telefon = '+905324620089'  # SMMM'nin telefon numarası
mesaj = 'Beyanname/mizan analiz raporu görsel olarak ektedir.'

pywhatkit.sendwhats_image(
    receiver=telefon,
    img_path=dosya_yolu,
    caption=mesaj,
    wait_time=15,
    tab_close=True
)

print("WhatsApp gönderimi tamamlandı.")