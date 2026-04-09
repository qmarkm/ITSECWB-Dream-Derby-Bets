import os

from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

DEFAULT_ALLOWED_EXTENSIONS = ['.png', '.gif', '.jpg', '.jpeg', '.webp']
DEFAULT_ALLOWED_PIL_FORMATS = {'PNG', 'GIF', 'JPEG', 'WEBP'}
DEFAULT_MAX_SIZE = 5 * 1024 * 1024  # 5 MB


def validate_uploaded_image(
    file,
    allowed_extensions=None,
    allowed_pil_formats=None,
    max_size=DEFAULT_MAX_SIZE,
):
    """
    Validate an uploaded image file:
      1. Extension whitelist
      2. File size limit
      3. PIL magic-byte verification (actual content matches claimed type)
    """
    if allowed_extensions is None:
        allowed_extensions = DEFAULT_ALLOWED_EXTENSIONS
    if allowed_pil_formats is None:
        allowed_pil_formats = DEFAULT_ALLOWED_PIL_FORMATS

    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_extensions:
        raise serializers.ValidationError(
            f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    if file.size > max_size:
        raise serializers.ValidationError("File too large. Maximum size is 5MB.")

    try:
        img = Image.open(file)
        img.verify()
        if img.format not in allowed_pil_formats:
            raise serializers.ValidationError(
                "File content does not match allowed image types."
            )
    except UnidentifiedImageError:
        raise serializers.ValidationError("Uploaded file is not a valid image.")
    except serializers.ValidationError:
        raise
    except Exception:
        raise serializers.ValidationError("Could not process the uploaded image.")
    finally:
        file.seek(0)
