import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export async function pickAvatar() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
  if (result.canceled) return undefined;
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    if (asset.width > 360 || asset.height > 360) {
      context.resize(asset.width >= asset.height ? { width: 360 } : { height: 360 });
    }
    const image = await context.renderAsync();
    try {
      const { base64 } = await image.saveAsync({ base64: true, compress: 0.72, format: SaveFormat.JPEG });
      const uri = `data:image/jpeg;base64,${base64 ?? ''}`;
      if (!base64 || uri.length > 220000) throw new Error('Ảnh quá lớn.');
      return uri;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
