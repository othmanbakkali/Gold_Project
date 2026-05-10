import os
import glob
from rembg import remove
from PIL import Image

try:
    files = glob.glob('C:/Users/othma/Downloads/*.*') + glob.glob('C:/Users/othma/OneDrive/Bureau/*.*')
    files.sort(key=os.path.getmtime, reverse=True)
    imgs = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not imgs:
        print("No image found.")
        exit(1)
        
    target_img = imgs[0]
    print(f"Began processing: {target_img}")
    
    input_image = Image.open(target_img)
    output_image = remove(input_image)
    output_path = 'client/public/logo.png'
    output_image.save(output_path)
    
    print(f"Processed: {target_img} -> {output_path}")
except Exception as e:
    print(f"Error: {e}")
