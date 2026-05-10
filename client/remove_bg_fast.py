import os
import glob
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
    
    img = Image.open(target_img).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    # Convert white and very light background to transparent
    for item in data:
        # Check if the pixel is bright (close to white)
        if item[0] > 235 and item[1] > 235 and item[2] > 235:
            new_data.append((255, 255, 255, 0)) # Fully transparent
        elif item[0] > 200 and item[1] > 200 and item[2] > 200:
            # Semi transparent for anti-aliased edge softening
            alpha_val = int(((255 - item[0]) / 55) * 255)
            new_data.append((item[0], item[1], item[2], alpha_val))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    output_path = 'client/public/logo.png'
    img.save(output_path, "PNG")
    
    print(f"Processed: {target_img} -> {output_path}")
except Exception as e:
    print(f"Error: {e}")
